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
let consistencyScore = 0;
let sortinoRatio = 0;
let calmarRatio = 0;
let expectancy = 0;
let riskAlerts = [];
let chart = null;

// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyAAlB5711qC5is_rVI14B2m1hbbq_4P2QE",
  authDomain: "tradeiq-b3fb3.firebaseapp.com",
  projectId: "tradeiq-b3fb3",
  storageBucket: "tradeiq-b3fb3.appspot.com",
  messagingSenderId: "383858939856",
  appId: "1:383858939856:web:baa4a3bd46789700de0bd5",
  measurementId: "G-8CRW4ZRNTW"
};

if (!firebase.apps.length) {
firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
// ================================
// Firestore setup
// ================================
const db = firebase.firestore();

function saveMetrics(userId, metrics) {
db.collection("users").doc(userId).collection("reports").add(metrics)
    .then(() => console.log("Metrics saved!"))
    .catch(err => console.error("Error saving metrics:", err));
}

function getMetrics(userId) {
  db.collection("users").doc(userId).collection("reports").get()
    .then(querySnapshot => {
      if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
          console.log("User metrics:", doc.data());
        });
      } else {
        console.log("No metrics found!");
      }
    })
    .catch(err => console.error("Error reading metrics:", err));
}

function login() {
  let email = document.getElementById("loginEmail").value;
  let password = document.getElementById("loginPassword").value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("Logged in!");
      document.getElementById("authSection").style.display = "none";
      document.getElementById("dashboard").style.display = "block";
    })
    .catch(err => alert(err.message));
}

// =========================
// REGISTER FUNCTION
// =========================
function register() {
  let email = document.getElementById("registerEmail").value;
  let password = document.getElementById("registerPassword").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("Account Created!");
    })
    .catch(err => {
      alert(err.message);
    });
}


function resetPassword() {
  let email = document.getElementById("resetEmail").value;
  auth.sendPasswordResetEmail(email)
    .then(() => alert("Reset email sent!"))
    .catch(err => alert(err.message));
}
function logout() {
  auth.signOut().then(() => {
    alert("Logged out!");
    document.getElementById("authSection").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  });
}

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("welcomeMsg").innerText = "Welcome, " + user.email;  
} else {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("welcomeMsg").innerText = "";
}
});

function getPeriodKey(date, filterType) {
  let d = new Date(date);
  if (filterType === "daily") {
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  } else if (filterType === "weekly") {
    let weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay()); // Sunday start
    return weekStart.toISOString().split("T")[0];
  } else if (filterType === "monthly") {
    return d.getFullYear() + "-" + (d.getMonth() + 1); // YYYY-MM
  }
  return date; // default raw date
}


  function convertCSVtoCandles(rows) {
  let candles = {};
  for (let i = 1; i < rows.length; i++) {
    let cols = rows[i].split(",").map(x => x.trim());
    let date = cols[0];
    let profit = parseFloat(cols[cols.length - 1]);
    if (isNaN(profit)) continue;

    if (!candles[date]) {
      candles[date] = { time: date, open: profit, high: profit, low: profit, close: profit };
    } else {
      candles[date].high = Math.max(candles[date].high, profit);
      candles[date].low = Math.min(candles[date].low, profit);
      candles[date].close = profit; // last trade of the day
    }
  }
  return Object.values(candles);
}

function renderCandlestickChart(candleData,rsiData){

if(chart){
chart.remove();
}

chart = LightweightCharts.createChart(
document.getElementById("equityChart"),
{
      width: document.getElementById("equityChart").clientWidth,
      height: 300,
      layout: { backgroundColor: '#0f172a', textColor: 'white' },
      grid: { vertLines: { color: '#334155' }, horzLines: { color: '#334155' } },
      timeScale: { timeVisible: true, secondsVisible: false }
    }
  );

  const candleSeries = chart.addCandlestickSeries();
  candleSeries.setData(candleData);

  if (rsiData) {
    const lineSeries = chart.addLineSeries({ color: 'cyan' });
    lineSeries.setData(rsiData);
  }
}
function calculateRSI(rows, period = 14) {
  let profits = [];

  // Extract closing profits from CSV rows
  for (let i = 1; i < rows.length; i++) {
    let cols = rows[i].split(",").map(x => x.trim());
    let profit = parseFloat(cols[cols.length - 1]);

    if (!isNaN(profit)) {
      profits.push({
        time: cols[0],
        close: profit
      });
    }
  }

  // Not enough data for RSI
  if (profits.length < period + 1) {
    return [];
  }

  let rsiData = [];
  let gains = 0;
  let losses = 0;

  // Initial average gain/loss calculation
  for (let i = 1; i <= period; i++) {
    let change = profits[i].close - profits[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

 let rs;
let rsi;

if (avgLoss === 0) {
    rsi = 100;
} else {
    rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
}

  rsiData.push({
    time: profits[period].time,
    value: Number(rsi.toFixed(2))
  });

  // Rolling RSI calculation
  for (let i = period + 1; i < profits.length; i++) {
    let change = profits[i].close - profits[i - 1].close;
    let gain = change > 0 ? change : 0;
    let loss = change < 0 ? Math.abs(change) : 0;

   avgGain = ((avgGain * (period - 1)) + gain) / period;
avgLoss = ((avgLoss * (period - 1)) + loss) / period;

if (avgLoss === 0) {
    rsi = 100;
} else {
    rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
}

    rsiData.push({
      time: profits[i].time,
      value: Number(rsi.toFixed(2))
    });
  }

  return rsiData;
}

// =========================
// MAIN FUNCTION
// =========================
function readCSV() {
     if (!auth.currentUser) {
    alert("Please log in first!");
    return;
  }
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
// RESET UI TABLE (before loop)
// =========================
let table = document.getElementById("tradeTable");
table.innerHTML = `
    <tr>
        <th>Date</th>
        <th>Symbol</th>
        <th>Profit</th>
    </tr>
`;

let tableHTML = "";
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
            let filterType = document.getElementById("filterSelect").value;
            let key = getPeriodKey(date, filterType);

            if (!dailyMap[key]) dailyMap[key] = 0;
            dailyMap[key] += profit;

            // Best/Worst period
            if (dailyMap[key] > bestProfit) {
              bestProfit = dailyMap[key];
              bestDay = key;
            }
            if (dailyMap[key] < worstProfit) {
              worstProfit = dailyMap[key];
              worstDay = key;
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
    // ✅ only build rows here
    tableHTML += `
        <tr>
            <td>${cols[0]}</td>
            <td>${cols[1]}</td>
            <td>${profit >= 0 ? "+" + profit : profit}</td>
        </tr>
    `;
}

// =========================
// APPLY IN ONE SHOT (after loop)
// =========================
table.innerHTML += tableHTML;

        // =========================
        // PROFIT FACTOR
        // =========================
        let totalWinProfit = profits.filter(p => p >= 0).reduce((a, b) => a + b, 0);
        let totalLossProfit = profits.filter(p => p < 0).reduce((a, b) => a + Math.abs(b), 0);

        // Calculation
profitFactor = totalLossProfit === 0
    ? Infinity
    : totalWinProfit / totalLossProfit;

// Display
document.getElementById("profitFactorCard").innerText =
    profitFactor === Infinity
        ? "∞"
        : profitFactor.toFixed(2);


        // =========================
        // RISK REWARD
        // =========================
        let avgWin = wins ? totalWinProfit / wins : 0;
        let avgLoss = losses ? totalLossProfit / losses : 0;

        if (avgLoss === 0 && avgWin > 0) riskReward = "∞";
        else if (avgWin === 0) riskReward = "0";
        else riskReward = (avgWin / avgLoss).toFixed(2);

        // =========================
        // SHARPE RATIOS
        // =========================
        let avg = profits.length ? profits.reduce((a,b)=>a+b,0)/profits.length : 0;

        let variance = profits.length ? profits.reduce((s,p)=>s+Math.pow(p-avg,2),0)/profits.length : 0;
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
       let peak = equity[0] || 0;
        maxDrawdown = 0;

        for (let eq of equity) {
            if (eq > peak) peak = eq;
            maxDrawdown = Math.max(maxDrawdown, peak - eq);
        }

        // =========================
// CONSISTENCY SCORE
// =========================
let profitableDays = Object.values(dailyMap).filter(p => p > 0).length;
let totalDays = Object.keys(dailyMap).length;
consistencyScore = totalDays ? ((profitableDays / totalDays) * 100).toFixed(2) : 0;

// =========================
// RISK ALERTS
// =========================
riskAlerts = [];
if (maxDrawdown > Math.abs(totalProfit) * 0.5) {
  riskAlerts.push("<span style='color:red;'>⚠️ High drawdown risk detected.</span>");
}
if (lossStreak >= 3) {
  riskAlerts.push("<span style='color:orange;'>⚠️ Extended losing streak.</span>");
}
if (winStreak >= 5) {
  riskAlerts.push("<span style='color:green;'>🔥 Strong winning streak — beware overconfidence.</span>");
}
if (profitFactor < 1 && totalProfit < 0) {
  riskAlerts.push("<span style='color:red;'>⚠️ Strategy unprofitable — review risk management.</span>");
}

// =========================
// SORTINO RATIO
// =========================
let downside = profits.filter(p => p < 0);
let downsideVariance = downside.reduce((s, p) => s + Math.pow(p, 2), 0) / (downside.length || 1);
let downsideDev = Math.sqrt(downsideVariance);

sortinoRatio = downsideDev === 0 ? "∞" : (avg / downsideDev).toFixed(2);

// =========================
// CALMAR RATIO
// =========================
let avgDailyReturn = totalTrades ? totalProfit / totalTrades : 0;
let annualizedReturn = avgDailyReturn * 252; // approx trading days in a year
calmarRatio = maxDrawdown === 0 ? "∞" : (annualizedReturn / maxDrawdown).toFixed(2);

// =========================
// EXPECTANCY
// =========================
let lossRate = totalTrades ? (losses / totalTrades) : 0;
expectancy = (winRate/100 * avgWin) - (lossRate * avgLoss);

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

         document.getElementById("consistencyCard").innerText = consistencyScore + "%";
      
         document.getElementById("sortinoCard").innerText =
         sortinoRatio === "∞" ? "∞" : sortinoRatio;

         document.getElementById("calmarCard").innerText =
         calmarRatio === "∞" ? "∞" : calmarRatio;

         document.getElementById("expectancyCard").innerText = expectancy.toFixed(2);

// =========================
// CANDLESTICK CHART
// =========================
const candleData = convertCSVtoCandles(rows);

// Example RSI overlay
const rsiData =
calculateRSI(rows);

renderCandlestickChart(candleData, rsiData);

    
            if (auth.currentUser) {
  saveMetrics(auth.currentUser.uid, {
   userId: auth.currentUser.uid,
    totalProfit,
    winRate,
    aiScore,
    maxDrawdown,
    profitFactor,
    riskReward,
    sharpeRatio,
    bestDay,
    worstDay
  });
}

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

        if (riskAlerts.length > 0) {
          summary += "<br><br><b>Risk Alerts:</b><br>" + riskAlerts.join("<br>");
        }
        summary += "<br><br><b>Consistency Score:</b> " + consistencyScore + "%";

        if (sortinoRatio < 1) summary += " ⚠️ Low Sortino Ratio — downside risk too high.";
        if (calmarRatio < 1) summary += " ⚠️ Weak Calmar Ratio — returns not compensating drawdown.";
        if (expectancy < 0) summary += " ⚠️ Negative expectancy — strategy losing over time.";

        if (expectancy < 0) {
          riskAlerts.push("<span style='color:red;'>⚠️ Negative expectancy — strategy losing over time.</span>");
        }

        // =========================
        // DAILY SUMMARY
        // =========================
        let dailySummary = "<h3>📅 Daily Performance</h3>";
for (let date in dailyMap) {
    let profit = dailyMap[date];
    let formatted = profit >= 0 
        ? "<span style='color:green;'>+" + profit.toFixed(2) + "</span>" 
        : "<span style='color:red;'>" + profit.toFixed(2) + "</span>";
    dailySummary += date + " → " + formatted + "<br>";
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
   if (!auth.currentUser) {
    alert("Please log in first!");
    return;
  }
    let csv = "Date,Profit\n";

    // Daily Performance with +/-
    for (let date in dailyMap) {
        let profit = dailyMap[date];
        let formatted = profit >= 0 
            ? "+" + profit.toFixed(2) 
            : profit.toFixed(2);
        csv += date + "," + formatted + "\n";
    }

    // Best/Worst Day with +/-
    let bestFormatted = bestProfit >= 0 
        ? "+" + bestProfit.toFixed(2) 
        : bestProfit.toFixed(2);
    let worstFormatted = worstProfit >= 0 
        ? "+" + worstProfit.toFixed(2) 
        : worstProfit.toFixed(2);

    csv += `Best Day,${bestDay} → ${bestFormatted}\n`;
    csv += `Worst Day,${worstDay} → ${worstFormatted}\n`;

    // Other metrics
    csv += `Win Rate,${winRate.toFixed(2)}%\n`;
    csv += `AI Score,${aiScore.toFixed(0)}\n`;
    csv += `Max Drawdown,${maxDrawdown.toFixed(2)}\n`;
    csv += `Profit Factor,${profitFactor}\n`;
    csv += `Risk-Reward,${riskReward}\n`;
    csv += `Sharpe Ratio,${sharpeRatio}\n`;
    csv += `Consistency Score,${consistencyScore}%\n`;
    csv += `Sortino Ratio,${sortinoRatio}\n`;
    csv += `Calmar Ratio,${calmarRatio}\n`;
    csv += `Expectancy,${expectancy.toFixed(2)}\n`;

    // Risk Alerts (strip HTML tags)
    if (riskAlerts.length > 0) {
      csv += `Risk Alerts,${riskAlerts.map(r => r.replace(/<[^>]+>/g, '')).join(" | ")}\n`;
    }

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
  if (!auth.currentUser) {
    alert("Please log in first!");
    return;
  }

  let win = window.open("", "_blank");

  // Report Header
  win.document.write("<h1>📊 TradeIQ Report</h1>");

  // Key Metrics Section
  win.document.write("<h3>📌 Key Metrics</h3>");
  win.document.write(`<p><b>Win Rate:</b> ${winRate.toFixed(2)}%</p>`);
  win.document.write(`<p><b>AI Score:</b> ${aiScore.toFixed(0)}</p>`);
  win.document.write(`<p><b>Max Drawdown:</b> ${maxDrawdown.toFixed(2)}</p>`);
  win.document.write(`<p><b>Profit Factor:</b> ${profitFactor}</p>`);
  win.document.write(`<p><b>Risk-Reward:</b> ${riskReward}</p>`);
  win.document.write(`<p><b>Sharpe Ratio:</b> ${sharpeRatio}</p>`);
  win.document.write(`<p><b>Consistency Score:</b> ${consistencyScore}%</p>`);
  win.document.write(`<p><b>Sortino Ratio:</b> ${sortinoRatio}</p>`);
  win.document.write(`<p><b>Calmar Ratio:</b> ${calmarRatio}</p>`);
  win.document.write(`<p><b>Expectancy:</b> ${expectancy.toFixed(2)}</p>`);

  // Best/Worst Days Section
  win.document.write("<h3>🏆 Best/Worst Days</h3>");
  let bestFormatted = bestProfit >= 0 
      ? `<span style='color:green;'>+${bestProfit.toFixed(2)}</span>` 
      : `<span style='color:red;'>${bestProfit.toFixed(2)}</span>`;
  win.document.write(`<p><b>Best Day:</b> ${bestDay} → ${bestFormatted}</p>`);

  let worstFormatted = worstProfit >= 0 
      ? `<span style='color:green;'>+${worstProfit.toFixed(2)}</span>` 
      : `<span style='color:red;'>${worstProfit.toFixed(2)}</span>`;
  win.document.write(`<p><b>Worst Day:</b> ${worstDay} → ${worstFormatted}</p>`);

  // Daily Performance Section
  win.document.write("<h3>📅 Daily Performance</h3>");
  for (let date in dailyMap) {
      let profit = dailyMap[date];
      let formatted = profit >= 0 
          ? `<span style='color:green;'>+${profit.toFixed(2)}</span>` 
          : `<span style='color:red;'>${profit.toFixed(2)}</span>`;
      win.document.write(`${date} → ${formatted}<br>`);
  }

  // Risk Alerts Section
  if (riskAlerts.length > 0) {
    win.document.write("<h3>⚠️ Risk Alerts</h3>" + riskAlerts.join("<br>"));
  }

  win.document.close();
  win.print();
}


 // =========================
// THEME TOGGLE BUTTON LOGIC
// =========================
const themeBtn = document.getElementById("themeToggle");

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");

    localStorage.setItem(
      "theme",
      document.body.classList.contains("light") ? "light" : "dark"
    );
  });
}

// Load saved theme on refresh
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
}
 

  function showLogin() {
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("registerBox").style.display = "none";
  document.getElementById("resetBox").style.display = "none";
}

function showRegister() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("registerBox").style.display = "block";
  document.getElementById("resetBox").style.display = "none";
}

function showReset() {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("registerBox").style.display = "none";
  document.getElementById("resetBox").style.display = "block";
}
