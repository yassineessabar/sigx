"""
MT5 Backtest Report Dashboard
Parses MT5 Strategy Tester HTML reports and displays interactive charts.
Run: C:\\Python312\\python.exe dashboard.py
Access: http://localhost:8050
"""

import os
import re
import glob
from html.parser import HTMLParser
from datetime import datetime

import dash
from dash import dcc, html, dash_table, Input, Output
import plotly.graph_objects as go
import plotly.express as px

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")


# ---------------------------------------------------------------------------
# HTML table parser
# ---------------------------------------------------------------------------
class TableExtractor(HTMLParser):
    """Extract all <tr> rows from HTML, grouping cells."""

    def __init__(self):
        super().__init__()
        self.rows = []
        self._current_row = None
        self._current_cell = None
        self._in_cell = False
        self._colspan = 1

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        if tag == "tr":
            self._current_row = []
        elif tag in ("td", "th"):
            self._in_cell = True
            self._current_cell = ""
            self._colspan = int(attrs_d.get("colspan", 1))
        elif tag == "img":
            pass  # skip images

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._in_cell:
            self._in_cell = False
            if self._current_row is not None:
                self._current_row.append(self._current_cell.strip())
                # add empty cells for colspan > 1 (but treat colspan=2 as one logical cell)
            self._current_cell = None
        elif tag == "tr":
            if self._current_row is not None:
                self.rows.append(self._current_row)
            self._current_row = None

    def handle_data(self, data):
        if self._in_cell and self._current_cell is not None:
            self._current_cell += data


def parse_mt5_number(s: str) -> float:
    """Parse MT5 formatted numbers like '10 000.00' or '-103.36' or '9.15% (977.72)'."""
    if not s:
        return 0.0
    # If it contains %, extract the percentage value
    s = s.strip()
    # Remove spaces used as thousands separators
    s = s.replace("\u00a0", "").replace(" ", "")
    # Handle percentage format like "9.15%(977.72)"
    m = re.match(r"^([0-9.\-]+)%", s)
    if m:
        return float(m.group(1))
    # Handle format like "977.72(9.15%)"
    m = re.match(r"^([0-9.\-]+)\(", s)
    if m:
        return float(m.group(1))
    try:
        return float(s)
    except ValueError:
        return 0.0


def extract_metric(rows, label: str) -> str:
    """Find a metric by label in the parsed rows, return the value in the next cell."""
    for row in rows:
        for i, cell in enumerate(row):
            if label in cell and i + 1 < len(row):
                return row[i + 1].strip()
    return ""


def parse_report(filepath: str) -> dict:
    """Parse a single MT5 .htm report file and return structured data."""
    with open(filepath, "rb") as f:
        raw = f.read()

    # Handle UTF-16 BOM
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        text = raw.decode("utf-16")
    else:
        text = raw.decode("utf-8", errors="replace")

    # Extract strategy name from Expert: field
    m = re.search(r"Expert:</td>\s*<td[^>]*><b>([^<]+)</b>", text)
    strategy_name = m.group(1).strip() if m else os.path.splitext(os.path.basename(filepath))[0]

    # Parse all tables
    parser = TableExtractor()
    parser.feed(text)
    all_rows = parser.rows

    # --- Extract summary metrics ---
    total_net_profit = parse_mt5_number(extract_metric(all_rows, "Total Net Profit"))
    gross_profit = parse_mt5_number(extract_metric(all_rows, "Gross Profit"))
    gross_loss = parse_mt5_number(extract_metric(all_rows, "Gross Loss"))
    profit_factor = parse_mt5_number(extract_metric(all_rows, "Profit Factor"))
    sharpe_ratio = parse_mt5_number(extract_metric(all_rows, "Sharpe Ratio"))
    recovery_factor = parse_mt5_number(extract_metric(all_rows, "Recovery Factor"))
    expected_payoff = parse_mt5_number(extract_metric(all_rows, "Expected Payoff"))

    # Total trades
    total_trades_str = extract_metric(all_rows, "Total Trades")
    total_trades = int(parse_mt5_number(total_trades_str)) if total_trades_str else 0

    # Drawdown - Balance Drawdown Maximal (e.g. "977.72 (9.15%)")
    dd_max_str = extract_metric(all_rows, "Balance Drawdown Maximal")
    dd_max_abs = 0.0
    dd_max_pct = 0.0
    if dd_max_str:
        dd_max_str_clean = dd_max_str.replace("\u00a0", "").replace(" ", "")
        m_dd = re.match(r"([0-9.\-]+)\(([0-9.\-]+)%\)", dd_max_str_clean)
        if m_dd:
            dd_max_abs = float(m_dd.group(1))
            dd_max_pct = float(m_dd.group(2))
        else:
            dd_max_abs = parse_mt5_number(dd_max_str)

    # Equity Drawdown Maximal
    eq_dd_str = extract_metric(all_rows, "Equity Drawdown Maximal")
    eq_dd_pct = 0.0
    if eq_dd_str:
        eq_dd_clean = eq_dd_str.replace("\u00a0", "").replace(" ", "")
        m_eq = re.match(r"([0-9.\-]+)\(([0-9.\-]+)%\)", eq_dd_clean)
        if m_eq:
            eq_dd_pct = float(m_eq.group(2))

    # --- Extract deals table for equity curve ---
    # Find the Deals section in HTML and parse deal rows
    deals_start = text.find(">Deals<")
    times = []
    balances = []

    if deals_start > 0:
        # Parse only the deals section
        deals_html = text[deals_start:]
        dp = TableExtractor()
        dp.feed(deals_html)
        deal_rows = dp.rows

        # Find header row to identify column indices
        header_idx = -1
        time_col = -1
        balance_col = -1
        for ri, row in enumerate(deal_rows):
            for ci, cell in enumerate(row):
                if cell.strip() == "Time":
                    header_idx = ri
                    time_col = ci
                if cell.strip() == "Balance":
                    balance_col = ci
            if header_idx >= 0:
                break

        if header_idx >= 0 and balance_col >= 0:
            for row in deal_rows[header_idx + 1:]:
                if len(row) <= balance_col:
                    continue
                time_str = row[time_col] if time_col < len(row) else ""
                bal_str = row[balance_col] if balance_col < len(row) else ""

                # Parse time
                try:
                    dt = datetime.strptime(time_str.strip(), "%Y.%m.%d %H:%M:%S")
                except (ValueError, AttributeError):
                    continue

                bal = parse_mt5_number(bal_str)
                if bal > 0:
                    times.append(dt)
                    balances.append(bal)

    # Symbol and period
    m_sym = re.search(r"Symbol:</td>\s*<td[^>]*><b>([^<]+)</b>", text)
    symbol = m_sym.group(1).strip() if m_sym else ""
    m_per = re.search(r"Period:</td>\s*<td[^>]*><b>([^<]+)</b>", text)
    period = m_per.group(1).strip() if m_per else ""

    return {
        "name": strategy_name,
        "file": os.path.basename(filepath),
        "symbol": symbol,
        "period": period,
        "total_net_profit": total_net_profit,
        "gross_profit": gross_profit,
        "gross_loss": gross_loss,
        "profit_factor": profit_factor,
        "sharpe_ratio": sharpe_ratio,
        "recovery_factor": recovery_factor,
        "expected_payoff": expected_payoff,
        "total_trades": total_trades,
        "max_drawdown_abs": dd_max_abs,
        "max_drawdown_pct": dd_max_pct,
        "equity_dd_pct": eq_dd_pct,
        "times": times,
        "balances": balances,
    }


# ---------------------------------------------------------------------------
# Load all reports
# ---------------------------------------------------------------------------
def load_all_reports():
    reports = []
    pattern = os.path.join(RESULTS_DIR, "*.htm")
    for fp in sorted(glob.glob(pattern)):
        try:
            r = parse_report(fp)
            reports.append(r)
            print(f"  Parsed: {r['name']} ({r['total_trades']} trades, PF={r['profit_factor']:.2f})")
        except Exception as e:
            print(f"  ERROR parsing {fp}: {e}")
    return reports


print("Loading MT5 reports from:", RESULTS_DIR)
reports = load_all_reports()
print(f"Loaded {len(reports)} reports.\n")

if not reports:
    print("No reports found. Place .htm files in", RESULTS_DIR)
    exit(1)

strategy_names = [r["name"] for r in reports]

# ---------------------------------------------------------------------------
# Build Dash app
# ---------------------------------------------------------------------------
app = dash.Dash(__name__, title="MT5 Backtest Dashboard")

# Color palette
COLORS = px.colors.qualitative.Set2 + px.colors.qualitative.Pastel1

app.layout = html.Div(
    style={"fontFamily": "Segoe UI, Tahoma, sans-serif", "margin": "20px", "backgroundColor": "#f8f9fa"},
    children=[
        html.H1("MT5 Backtest Dashboard", style={"textAlign": "center", "color": "#2c3e50", "marginBottom": "5px"}),
        html.P(
            f"{len(reports)} strategies loaded from {RESULTS_DIR}",
            style={"textAlign": "center", "color": "#7f8c8d", "marginBottom": "30px"},
        ),
        # --- Summary Table ---
        html.Div(
            style={"backgroundColor": "white", "padding": "20px", "borderRadius": "8px",
                   "boxShadow": "0 2px 4px rgba(0,0,0,0.1)", "marginBottom": "30px"},
            children=[
                html.H2("Strategy Summary", style={"color": "#2c3e50", "marginTop": "0"}),
                dash_table.DataTable(
                    id="summary-table",
                    columns=[
                        {"name": "Strategy", "id": "name"},
                        {"name": "Symbol", "id": "symbol"},
                        {"name": "Period", "id": "period"},
                        {"name": "Net Profit", "id": "total_net_profit", "type": "numeric",
                         "format": dash_table.FormatTemplate.money(2)},
                        {"name": "Profit Factor", "id": "profit_factor", "type": "numeric",
                         "format": {"specifier": ".2f"}},
                        {"name": "Sharpe Ratio", "id": "sharpe_ratio", "type": "numeric",
                         "format": {"specifier": ".2f"}},
                        {"name": "Recovery Factor", "id": "recovery_factor", "type": "numeric",
                         "format": {"specifier": ".2f"}},
                        {"name": "Total Trades", "id": "total_trades", "type": "numeric"},
                        {"name": "Max DD %", "id": "max_drawdown_pct", "type": "numeric",
                         "format": {"specifier": ".2f"}},
                        {"name": "Max DD $", "id": "max_drawdown_abs", "type": "numeric",
                         "format": dash_table.FormatTemplate.money(2)},
                        {"name": "Expected Payoff", "id": "expected_payoff", "type": "numeric",
                         "format": {"specifier": ".2f"}},
                    ],
                    data=[
                        {
                            "name": r["name"],
                            "symbol": r["symbol"],
                            "period": r["period"],
                            "total_net_profit": r["total_net_profit"],
                            "profit_factor": r["profit_factor"],
                            "sharpe_ratio": r["sharpe_ratio"],
                            "recovery_factor": r["recovery_factor"],
                            "total_trades": r["total_trades"],
                            "max_drawdown_pct": r["max_drawdown_pct"],
                            "max_drawdown_abs": r["max_drawdown_abs"],
                            "expected_payoff": r["expected_payoff"],
                        }
                        for r in reports
                    ],
                    sort_action="native",
                    style_table={"overflowX": "auto"},
                    style_header={
                        "backgroundColor": "#2c3e50",
                        "color": "white",
                        "fontWeight": "bold",
                        "textAlign": "center",
                    },
                    style_cell={"textAlign": "right", "padding": "8px", "minWidth": "90px"},
                    style_cell_conditional=[
                        {"if": {"column_id": "name"}, "textAlign": "left", "fontWeight": "bold", "minWidth": "160px"},
                        {"if": {"column_id": "symbol"}, "textAlign": "center"},
                        {"if": {"column_id": "period"}, "textAlign": "center", "minWidth": "200px"},
                    ],
                    style_data_conditional=[
                        {
                            "if": {"filter_query": "{total_net_profit} > 0", "column_id": "total_net_profit"},
                            "color": "#27ae60", "fontWeight": "bold",
                        },
                        {
                            "if": {"filter_query": "{total_net_profit} < 0", "column_id": "total_net_profit"},
                            "color": "#e74c3c", "fontWeight": "bold",
                        },
                        {
                            "if": {"filter_query": "{profit_factor} >= 1.5", "column_id": "profit_factor"},
                            "color": "#27ae60", "fontWeight": "bold",
                        },
                        {"if": {"row_index": "odd"}, "backgroundColor": "#f7f9fc"},
                    ],
                ),
            ],
        ),
        # --- All Equity Curves ---
        html.Div(
            style={"backgroundColor": "white", "padding": "20px", "borderRadius": "8px",
                   "boxShadow": "0 2px 4px rgba(0,0,0,0.1)", "marginBottom": "30px"},
            children=[
                html.H2("All Equity Curves", style={"color": "#2c3e50", "marginTop": "0"}),
                dcc.Graph(id="all-equity-curves"),
            ],
        ),
        # --- Individual Equity Curve ---
        html.Div(
            style={"backgroundColor": "white", "padding": "20px", "borderRadius": "8px",
                   "boxShadow": "0 2px 4px rgba(0,0,0,0.1)", "marginBottom": "30px"},
            children=[
                html.H2("Individual Equity Curve", style={"color": "#2c3e50", "marginTop": "0"}),
                dcc.Dropdown(
                    id="strategy-selector",
                    options=[{"label": n, "value": n} for n in strategy_names],
                    value=strategy_names[0],
                    style={"marginBottom": "15px", "maxWidth": "500px"},
                ),
                dcc.Graph(id="individual-equity-curve"),
            ],
        ),
        # --- Comparison Charts Row ---
        html.Div(
            style={"display": "flex", "gap": "20px", "marginBottom": "30px", "flexWrap": "wrap"},
            children=[
                html.Div(
                    style={"flex": "1", "minWidth": "400px", "backgroundColor": "white", "padding": "20px",
                           "borderRadius": "8px", "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"},
                    children=[
                        html.H2("Profit Factor Comparison", style={"color": "#2c3e50", "marginTop": "0"}),
                        dcc.Graph(id="profit-factor-chart"),
                    ],
                ),
                html.Div(
                    style={"flex": "1", "minWidth": "400px", "backgroundColor": "white", "padding": "20px",
                           "borderRadius": "8px", "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"},
                    children=[
                        html.H2("Net Profit Comparison", style={"color": "#2c3e50", "marginTop": "0"}),
                        dcc.Graph(id="net-profit-chart"),
                    ],
                ),
            ],
        ),
        # --- Drawdown and Sharpe ---
        html.Div(
            style={"display": "flex", "gap": "20px", "marginBottom": "30px", "flexWrap": "wrap"},
            children=[
                html.Div(
                    style={"flex": "1", "minWidth": "400px", "backgroundColor": "white", "padding": "20px",
                           "borderRadius": "8px", "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"},
                    children=[
                        html.H2("Max Drawdown Comparison (%)", style={"color": "#2c3e50", "marginTop": "0"}),
                        dcc.Graph(id="drawdown-chart"),
                    ],
                ),
                html.Div(
                    style={"flex": "1", "minWidth": "400px", "backgroundColor": "white", "padding": "20px",
                           "borderRadius": "8px", "boxShadow": "0 2px 4px rgba(0,0,0,0.1)"},
                    children=[
                        html.H2("Sharpe Ratio Comparison", style={"color": "#2c3e50", "marginTop": "0"}),
                        dcc.Graph(id="sharpe-chart"),
                    ],
                ),
            ],
        ),
    ],
)


# ---------------------------------------------------------------------------
# Callbacks
# ---------------------------------------------------------------------------

@app.callback(Output("all-equity-curves", "figure"), Input("summary-table", "data"))
def update_all_equity_curves(_):
    fig = go.Figure()
    for i, r in enumerate(reports):
        if r["times"] and r["balances"]:
            color = COLORS[i % len(COLORS)]
            fig.add_trace(go.Scatter(
                x=r["times"], y=r["balances"],
                mode="lines", name=r["name"],
                line=dict(color=color, width=2),
                hovertemplate="%{x}<br>Balance: $%{y:,.2f}<extra>" + r["name"] + "</extra>",
            ))
    fig.update_layout(
        xaxis_title="Date", yaxis_title="Balance ($)",
        template="plotly_white", height=500,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=60, r=20, t=40, b=60),
        hovermode="x unified",
    )
    return fig


@app.callback(Output("individual-equity-curve", "figure"), Input("strategy-selector", "value"))
def update_individual_equity(selected):
    r = next((r for r in reports if r["name"] == selected), None)
    fig = go.Figure()
    if r and r["times"] and r["balances"]:
        fig.add_trace(go.Scatter(
            x=r["times"], y=r["balances"],
            mode="lines", name="Balance",
            line=dict(color="#2980b9", width=2),
            fill="tozeroy", fillcolor="rgba(41,128,185,0.1)",
            hovertemplate="%{x}<br>Balance: $%{y:,.2f}<extra></extra>",
        ))
        # Add drawdown shading
        peak = r["balances"][0]
        drawdowns = []
        for b in r["balances"]:
            peak = max(peak, b)
            drawdowns.append(b - peak)
        fig.add_trace(go.Scatter(
            x=r["times"], y=drawdowns,
            mode="lines", name="Drawdown",
            line=dict(color="#e74c3c", width=1),
            fill="tozeroy", fillcolor="rgba(231,76,60,0.15)",
            yaxis="y2",
            hovertemplate="%{x}<br>Drawdown: $%{y:,.2f}<extra></extra>",
        ))
        fig.update_layout(
            yaxis2=dict(title="Drawdown ($)", overlaying="y", side="right", showgrid=False),
        )
    fig.update_layout(
        title=dict(text=f"{selected}", font=dict(size=16)),
        xaxis_title="Date", yaxis_title="Balance ($)",
        template="plotly_white", height=450,
        margin=dict(l=60, r=60, t=50, b=60),
        hovermode="x unified",
    )
    if r:
        fig.add_annotation(
            text=f"Net Profit: ${r['total_net_profit']:,.2f}  |  PF: {r['profit_factor']:.2f}  |  "
                 f"Trades: {r['total_trades']}  |  Max DD: {r['max_drawdown_pct']:.1f}%",
            xref="paper", yref="paper", x=0.5, y=-0.15,
            showarrow=False, font=dict(size=12, color="#555"),
        )
    return fig


@app.callback(Output("profit-factor-chart", "figure"), Input("summary-table", "data"))
def update_pf_chart(_):
    sorted_r = sorted(reports, key=lambda x: x["profit_factor"], reverse=True)
    names = [r["name"] for r in sorted_r]
    values = [r["profit_factor"] for r in sorted_r]
    colors = ["#27ae60" if v >= 1.0 else "#e74c3c" for v in values]
    fig = go.Figure(go.Bar(
        x=names, y=values, marker_color=colors,
        text=[f"{v:.2f}" for v in values], textposition="outside",
        hovertemplate="%{x}<br>Profit Factor: %{y:.2f}<extra></extra>",
    ))
    fig.add_hline(y=1.0, line_dash="dash", line_color="#95a5a6", annotation_text="Break-even (1.0)")
    fig.update_layout(
        template="plotly_white", height=400,
        xaxis_tickangle=-45, yaxis_title="Profit Factor",
        margin=dict(l=50, r=20, t=20, b=120),
    )
    return fig


@app.callback(Output("net-profit-chart", "figure"), Input("summary-table", "data"))
def update_np_chart(_):
    sorted_r = sorted(reports, key=lambda x: x["total_net_profit"], reverse=True)
    names = [r["name"] for r in sorted_r]
    values = [r["total_net_profit"] for r in sorted_r]
    colors = ["#27ae60" if v >= 0 else "#e74c3c" for v in values]
    fig = go.Figure(go.Bar(
        x=names, y=values, marker_color=colors,
        text=[f"${v:,.0f}" for v in values], textposition="outside",
        hovertemplate="%{x}<br>Net Profit: $%{y:,.2f}<extra></extra>",
    ))
    fig.add_hline(y=0, line_dash="dash", line_color="#95a5a6")
    fig.update_layout(
        template="plotly_white", height=400,
        xaxis_tickangle=-45, yaxis_title="Net Profit ($)",
        margin=dict(l=60, r=20, t=20, b=120),
    )
    return fig


@app.callback(Output("drawdown-chart", "figure"), Input("summary-table", "data"))
def update_dd_chart(_):
    sorted_r = sorted(reports, key=lambda x: x["max_drawdown_pct"])
    names = [r["name"] for r in sorted_r]
    values = [r["max_drawdown_pct"] for r in sorted_r]
    fig = go.Figure(go.Bar(
        x=names, y=values,
        marker_color=["#e74c3c" if v > 20 else "#e67e22" if v > 10 else "#27ae60" for v in values],
        text=[f"{v:.1f}%" for v in values], textposition="outside",
        hovertemplate="%{x}<br>Max Drawdown: %{y:.2f}%<extra></extra>",
    ))
    fig.add_hline(y=10, line_dash="dash", line_color="#e67e22", annotation_text="10% threshold")
    fig.update_layout(
        template="plotly_white", height=400,
        xaxis_tickangle=-45, yaxis_title="Max Drawdown (%)",
        margin=dict(l=50, r=20, t=20, b=120),
    )
    return fig


@app.callback(Output("sharpe-chart", "figure"), Input("summary-table", "data"))
def update_sharpe_chart(_):
    sorted_r = sorted(reports, key=lambda x: x["sharpe_ratio"], reverse=True)
    names = [r["name"] for r in sorted_r]
    values = [r["sharpe_ratio"] for r in sorted_r]
    colors = ["#27ae60" if v >= 1.0 else "#e67e22" if v >= 0 else "#e74c3c" for v in values]
    fig = go.Figure(go.Bar(
        x=names, y=values, marker_color=colors,
        text=[f"{v:.2f}" for v in values], textposition="outside",
        hovertemplate="%{x}<br>Sharpe Ratio: %{y:.2f}<extra></extra>",
    ))
    fig.add_hline(y=1.0, line_dash="dash", line_color="#27ae60", annotation_text="Good (1.0)")
    fig.update_layout(
        template="plotly_white", height=400,
        xaxis_tickangle=-45, yaxis_title="Sharpe Ratio",
        margin=dict(l=50, r=20, t=20, b=120),
    )
    return fig


# ---------------------------------------------------------------------------
# Run server
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Starting MT5 Backtest Dashboard on http://0.0.0.0:8050")
    app.run(host="0.0.0.0", port=8050, debug=False)
