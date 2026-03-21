from bs4 import BeautifulSoup
import pandas as pd
import glob
import os


def parse_mt5_report(html_path: str) -> dict:
    """Extract key metrics from MT5 HTML backtest report."""
    # MT5 reports can be UTF-16 or UTF-8
    with open(html_path, "rb") as f:
        raw = f.read()
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        text = raw.decode("utf-16")
    else:
        text = raw.decode("utf-8", errors="ignore")
    soup = BeautifulSoup(text, "html.parser")

    metrics = {"file": os.path.basename(html_path)}

    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True)
            value = cells[1].get_text(strip=True)

            try:
                if "Profit Factor" in key:
                    metrics["profit_factor"] = float(value or 0)
                elif "Total Net Profit" in key:
                    metrics["net_profit"] = float(value.replace(",", "").replace(" ", "") or 0)
                elif "Maximal Drawdown" in key or "Max Drawdown" in key:
                    metrics["max_drawdown"] = value
                elif "Total Trades" in key:
                    metrics["total_trades"] = int(value or 0)
                elif "Win" in key and "%" in value:
                    metrics["win_rate"] = value
                elif "Sharpe Ratio" in key:
                    metrics["sharpe"] = float(value or 0)
                elif "Recovery Factor" in key:
                    metrics["recovery_factor"] = float(value or 0)
                elif "Expected Payoff" in key:
                    metrics["expected_payoff"] = float(value.replace(",", "").replace(" ", "") or 0)
            except (ValueError, TypeError):
                pass

    return metrics


if __name__ == "__main__":
    reports = sorted(glob.glob("results/*.htm") + glob.glob("results/*.html"))

    if not reports:
        print("No HTML reports found in results/")
        quit()

    all_results = []
    for report in reports:
        result = parse_mt5_report(report)
        all_results.append(result)
        pf = result.get("profit_factor", "N/A")
        np_ = result.get("net_profit", "N/A")
        print(f"{result['file']}: PF={pf}, Net={np_}")

    df = pd.DataFrame(all_results)

    if "profit_factor" in df.columns:
        df = df.sort_values("profit_factor", ascending=False)

    df.to_csv("results/rankings.csv", index=False)
    print(f"\nSaved rankings -> results/rankings.csv")

    print("\nTop Strategies:")
    cols = [c for c in ["file", "profit_factor", "net_profit", "max_drawdown", "total_trades"] if c in df.columns]
    print(df[cols].to_string(index=False))
