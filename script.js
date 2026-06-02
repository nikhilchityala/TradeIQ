// =========================
// GLOBAL VARIABLES
// =========================
let dailyMap = {};
let bestDay = null;
let worstDay = null;

let bestProfit = -Infinity;
let worstProfit = Infinity;

let winRate = 0;
let aiScore = 0;
let maxDrawdown = 0;

let profitFactor = 0;
let riskReward = 0;
let sharpeRatio = 0;

// =========================
// MAIN FUNCTION
// =========================
function readCSV() {

    let file = document.getElementById("fileInput").files[0];

    if (!file) {
        document.getElementById("result").innerText = "Please select a CSV file";
        return;
    }

    let reader = new FileReader();

    reader.onload = function (e) {

        let rows = e.target.result.trim().split("\n");

        // =========================
        // RESET VALUES
        // =========================
        let totalProfit = 0;
        let wins = 0;
        let losses = 0;

        let runningProfit = 0;
        let equity = [];
        let profits = [];

        dailyMap = {};
        bestDay = null;
        worstDay = null;
        bestProfit = -Infinity;
        worstProfit = Infinity;

        let winStreak = 0;
        let lossStreak = 0;
        let currentWin = 0;
        let currentLoss = 0;

        // =========================
        // RESET UI TABLE
        // =========================
        let table = document.getElementById("tradeTable");
        table.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Symbol</th>
                <th>Profit</th>
            </tr>
        `;

        // =========================
        // RESET CHART
        // =========================
        let canvas = document.getElementById("profitChart");
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let x = 20;

        // =========================
        // SINGLE LOOP (CORE ENGINE)
        // =========================
        for (let i = 1; i < rows.length; i++) {

            let cols = rows[i].split(",").map(x => x.trim());
            let profit = parseFloat(cols[cols.length - 1]);

            if (isNaN(profit)) continue;

            let date = cols[0];

            // ---------- BASIC STATS ----------
            totalProfit += profit;
            profits.push(profit);

            if (profit >= 0) wins++;
            else losses++;

            // ---------- EQUITY ----------
            runningProfit += profit;
            equity.push(runningProfit);

            // ---------- DAILY MAP ----------
            if (!dailyMap[date]) dailyMap[date] = 0;
            dailyMap[date] += profit;

            // ---------- BEST / WORST DAY ----------
            if (dailyMap[date] > bestProfit) {
                bestProfit = dailyMap[date];
                bestDay = date;
            }

            if (dailyMap[date] < worstProfit) {
                worstProfit = dailyMap[date];
                worstDay = date;
            }

            // ---------- STREAKS ----------
            if (profit >= 0) {
                currentWin++;
                currentLoss = 0;
            } else {
                currentLoss++;
                currentWin = 0;
            }

            winStreak = Math.max(winStreak, currentWin);
            lossStreak = Math.max(lossStreak, currentLoss);

            // ---------- BAR CHART ----------
            let barHeight = Math.min(Math.abs(profit) * 2, 100);
            ctx.fillStyle = profit >= 0 ? "green" : "red";
            ctx.fillRect(x, 100 - barHeight, 40, barHeight);
            x += 50;

            // ---------- TABLE ----------
            let row = table.insertRow();
            row.insertCell(0).textContent = cols[0];
            row.insertCell(1).textContent = cols[1];
            row.insertCell(2).textContent = profit >= 0 ? "+" + profit : profit;
        }

        // =========================
        // PROFIT FACTOR
        // =========================
        let totalWinProfit = profits.filter(p => p >= 0).reduce((a, b) => a + b, 0);
        let totalLossProfit = profits.filter(p => p < 0).reduce((a, b) => a + Math.abs(b), 0);

        profitFactor = totalLossProfit === 0
            ? "∞"
            : (totalWinProfit / totalLossProfit).toFixed(2);

        // =========================
        // RISK REWARD
        // =========================
        let avgWin = wins ? totalWinProfit / wins : 0;
        let avgLoss = losses ? totalLossProfit / losses : 0;

        if (avgLoss === 0 && avgWin > 0) riskReward = "∞";
        else if (avgWin === 0) riskReward = "0";
        else riskReward = (avgLoss / avgWin).toFixed(2);

        // =========================
        // SHARPE RATIO
        // =========================
        let avg = profits.reduce((a, b) => a + b, 0) / profits.length;

        let variance = profits.reduce((s, p) => s + Math.pow(p - avg, 2), 0) / profits.length;
        let stdDev = Math.sqrt(variance);

        sharpeRatio = stdDev === 0 ? "∞" : (avg / stdDev).toFixed(2);

        // =========================
        // WIN RATE
        // =========================
        let totalTrades = wins + losses;
        winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

        // =========================
        // AI SCORE
        // =========================
        aiScore = 0;
        aiScore += winRate;
        aiScore += totalProfit > 0 ? 10 : -10;
        aiScore += winStreak * 2;
        aiScore -= lossStreak * 2;
        aiScore = Math.max(0, Math.min(100, aiScore));

        // =========================
        // DRAWDOWN
        // =========================
        let peak = 0;
        maxDrawdown = 0;

        for (let eq of equity) {
            if (eq > peak) peak = eq;
            maxDrawdown = Math.max(maxDrawdown, peak - eq);
        }

        // =========================
        // EQUITY CHART
        // =========================
        let eqCanvas = document.getElementById("equityChart");
        let eqCtx = eqCanvas.getContext("2d");

        eqCtx.clearRect(0, 0, eqCanvas.width, eqCanvas.height);
        eqCtx.beginPath();
        eqCtx.moveTo(20, 100);

        let stepX = 40;
        let ex = 20;

        let minEquity = Math.min(...equity);
        let maxEquity = Math.max(...equity);
        let range = maxEquity - minEquity || 1;

        for (let i = 0; i < equity.length; i++) {
            let y = 200 - ((equity[i] - minEquity) / range * 200);
            eqCtx.lineTo(ex, y);
            ex += stepX;
        }

        eqCtx.strokeStyle = "cyan";
        eqCtx.lineWidth = 2;
        eqCtx.stroke();

        // =========================
        // UI UPDATES
        // =========================
        document.getElementById("profitCard").innerText = totalProfit;
        document.getElementById("winRateCard").innerText = winRate.toFixed(2) + "%";
        document.getElementById("tradeCard").innerText = totalTrades;

        document.getElementById("profitFactorCard").innerText =
            profitFactor === "∞" ? "∞" : profitFactor;

        document.getElementById("riskRewardCard").innerText =
            riskReward === "∞" ? "∞" : riskReward;

        document.getElementById("sharpeRatioCard").innerText =
            sharpeRatio === "∞" ? "∞" : sharpeRatio;

        document.getElementById("aiScoreCard").innerText = aiScore.toFixed(0);
        document.getElementById("drawdownCard").innerText = maxDrawdown.toFixed(2);

        document.getElementById("bestDayCard").innerText =
            bestDay ? bestDay + " → " + bestProfit.toFixed(2) : "-";

        document.getElementById("worstDayCard").innerText =
            worstDay ? worstDay + " → " + worstProfit.toFixed(2) : "-";

        // =========================
        // AI SUMMARY
        // =========================
        let summary = "";

        if (winRate >= 70) summary = "🔥 Strong performance. High win rate detected.";
        else if (winRate >= 50) summary = "👍 Decent performance. Slight improvement needed.";
        else summary = "⚠️ Weak performance. Focus on strategy improvement.";

        summary += totalProfit < 0
            ? " Overall loss detected. Risk management is critical."
            : " Overall profit positive. Good consistency.";

        if (lossStreak >= 3) summary += " ⚠️ Losing streak detected.";
        if (winStreak >= 3) summary += " 🔥 Strong winning streak.";

        // =========================
        // DAILY SUMMARY
        // =========================
        let dailySummary = "<h3>📅 Daily Performance</h3>";
        for (let date in dailyMap) {
            dailySummary += date + " → " + dailyMap[date] + "<br>";
        }

        document.getElementById("result").innerHTML =
            "Total Profit: " + totalProfit + "<br>" +
            "Wins: " + wins + "<br>" +
            "Losses: " + losses + "<br>" +
            "Win Rate: " + winRate.toFixed(2) + "%<br><br>" +
            "<b>AI Summary:</b><br>" + summary +
            "<br><br>" + dailySummary;
    };

    reader.readAsText(file);
}

// =========================
// EXPORT CSV
// =========================
function exportCSV() {
    let csv = "Date,Profit\n";

    for (let date in dailyMap) {
        csv += date + "," + dailyMap[date] + "\n";
    }

    csv += `Best Day,${bestDay} → ${bestProfit}\n`;
    csv += `Worst Day,${worstDay} → ${worstProfit}\n`;
    csv += `Win Rate,${winRate.toFixed(2)}%\n`;
    csv += `AI Score,${aiScore.toFixed(0)}\n`;
    csv += `Max Drawdown,${maxDrawdown.toFixed(2)}\n`;
    csv += `Profit Factor,${profitFactor}\n`;
    csv += `Risk-Reward,${riskReward}\n`;
    csv += `Sharpe Ratio,${sharpeRatio}\n`;

    let blob = new Blob([csv], { type: "text/csv" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "TradeIQ_Report.csv";
    a.click();
}

// =========================
// EXPORT PDF
// =========================
function exportPDF() {
    let win = window.open("", "_blank");

    win.document.write("<h1>TradeIQ Report</h1>");
    win.document.write(document.getElementById("result").innerHTML);

    win.document.write(`<p><b>Best Day:</b> ${bestDay} → ${bestProfit}</p>`);
    win.document.write(`<p><b>Worst Day:</b> ${worstDay} → ${worstProfit}</p>`);
    win.document.write(`<p><b>Win Rate:</b> ${winRate.toFixed(2)}%</p>`);
    win.document.write(`<p><b>AI Score:</b> ${aiScore.toFixed(0)}</p>`);
    win.document.write(`<p><b>Max Drawdown:</b> ${maxDrawdown.toFixed(2)}</p>`);
    win.document.write(`<p><b>Profit Factor:</b> ${profitFactor}</p>`);
    win.document.write(`<p><b>Risk-Reward:</b> ${riskReward}</p>`);
    win.document.write(`<p><b>Sharpe Ratio:</b> ${sharpeRatio}</p>`);

    win.document.close();
    win.print();
}