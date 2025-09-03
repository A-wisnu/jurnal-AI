import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

// --- Type Definitions ---
interface Trade {
    id: string;
    date: string;
    pair: string;
    lotSize: number;
    position: 'long' | 'short';
    status: 'win' | 'loss' | 'breakeven';
    pnl: number; // in Rupiah
    commission: number; // in Rupiah
    session: 'asia' | 'london' | 'new york';
    bias: 'bullish' | 'bearish' | 'ranging';
    confirmSmt: boolean;
    newsImpact: 'high' | 'medium' | 'low' | 'none';
    emotion: string;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    notes: string;
}

interface AnalysisMetrics {
    totalNetPnl: string;
    winRate: string;
    totalTrades: number;
    totalCommissions: string;
    totalProfit: string;
    totalLoss: string;
    mostProfitableSession: string;
    bestPerformingGrade: string;
}

interface ChartData {
    labels: string[];
    data: number[];
}

interface AnalysisResult {
    metrics: AnalysisMetrics;
    cumulativePnlData: ChartData;
    outcomeDistributionData: ChartData;
    sessionPnlData: ChartData;
    gradePnlData: ChartData;
}

// --- Main App Component ---
const App = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Initializing Journal...');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [showIntro, setShowIntro] = useState(true);

    const cumulativeChartRef = useRef<HTMLCanvasElement>(null);
    const outcomeChartRef = useRef<HTMLCanvasElement>(null);
    const sessionChartRef = useRef<HTMLCanvasElement>(null);
    const gradeChartRef = useRef<HTMLCanvasElement>(null);

    const chartInstancesRef = useRef<any>({}); // To hold all Chart.js instances

    useEffect(() => {
        // Intro screen logic
        const introTimer = setTimeout(() => {
            setShowIntro(false);
        }, 3000); 

        try {
            const savedTrades = localStorage.getItem('tradingJournalTrades');
            if (savedTrades) {
                setTrades(JSON.parse(savedTrades));
            }
        } catch (error) {
            console.error("Failed to load trades from local storage:", error);
        }

        return () => {
            clearTimeout(introTimer);
        }
    }, []);


    useEffect(() => {
        try {
            localStorage.setItem('tradingJournalTrades', JSON.stringify(trades));
        } catch (error) {
            console.error("Failed to save trades to local storage:", error);
        }
    }, [trades]);

     useEffect(() => {
        // Destroy all previous chart instances before creating new ones
        Object.values(chartInstancesRef.current).forEach((chart: any) => chart.destroy());
        chartInstancesRef.current = {};

        if (analysisResult && (window as any).Chart) {
            const commonChartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#2c3e50',
                            font: { family: "'Roboto', sans-serif" }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#8899a6' },
                        grid: { color: 'rgba(223, 230, 233, 0.5)' }
                    },
                    y: {
                        ticks: { color: '#8899a6' },
                        grid: { color: 'rgba(223, 230, 233, 0.5)' }
                    }
                }
            };
            
            // 1. Cumulative PnL Chart (Line)
            if (analysisResult.cumulativePnlData && cumulativeChartRef.current) {
                const ctx = cumulativeChartRef.current.getContext('2d');
                if (ctx) {
                    chartInstancesRef.current.cumulative = new (window as any).Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: analysisResult.cumulativePnlData.labels,
                            datasets: [{
                                label: 'Cumulative Net PnL (Rp)',
                                data: analysisResult.cumulativePnlData.data,
                                borderColor: '#3498db',
                                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                                fill: true,
                                tension: 0.4,
                            }]
                        },
                        options: commonChartOptions
                    });
                }
            }
             // 2. Outcome Distribution Chart (Doughnut)
            if (analysisResult.outcomeDistributionData && outcomeChartRef.current) {
                const ctx = outcomeChartRef.current.getContext('2d');
                if (ctx) {
                    chartInstancesRef.current.outcome = new (window as any).Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['Wins', 'Losses', 'Breakeven'],
                            datasets: [{
                                label: 'Trade Outcomes',
                                data: analysisResult.outcomeDistributionData.data,
                                backgroundColor: ['#2ecc71', '#e74c3c', '#95a5a6'],
                                borderWidth: 3,
                                borderColor: '#f4f7f9',
                            }]
                        },
                        options: { 
                            responsive: true, 
                            maintainAspectRatio: false, 
                            plugins: { 
                                legend: { 
                                    position: 'top', 
                                    labels: { color: '#2c3e50', font: { family: "'Roboto', sans-serif" } } 
                                } 
                            } 
                        }
                    });
                }
            }
             // 3. PnL by Session (Bar)
            if (analysisResult.sessionPnlData && sessionChartRef.current) {
                const ctx = sessionChartRef.current.getContext('2d');
                if (ctx) {
                    chartInstancesRef.current.session = new (window as any).Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: analysisResult.sessionPnlData.labels,
                            datasets: [{
                                label: 'Net PnL by Session',
                                data: analysisResult.sessionPnlData.data,
                                backgroundColor: ['#1abc9c', '#f1c40f', '#e67e22'],
                                borderRadius: 4,
                            }]
                        },
                        options: { ...commonChartOptions, plugins: { ...commonChartOptions.plugins, legend: { display: false } } }
                    });
                }
            }
             // 4. PnL by Grade (Bar)
            if (analysisResult.gradePnlData && gradeChartRef.current) {
                const ctx = gradeChartRef.current.getContext('2d');
                if (ctx) {
                    chartInstancesRef.current.grade = new (window as any).Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: analysisResult.gradePnlData.labels,
                            datasets: [{
                                label: 'Net PnL by Grade',
                                data: analysisResult.gradePnlData.data,
                                backgroundColor: ['#9b59b6', '#34495e', '#3498db', '#e74c3c', '#95a5a6'],
                                borderRadius: 4,
                            }]
                        },
                        options: { ...commonChartOptions, plugins: { ...commonChartOptions.plugins, legend: { display: false } } }
                    });
                }
            }
        }
     }, [analysisResult]);

    const addTrade = (trade: Omit<Trade, 'id'>) => {
        const newTrade = { ...trade, id: Date.now().toString() };
        setTrades(prevTrades => [...prevTrades, newTrade]);
    };

    const runAiImport = async (excelJson: any[]) => {
        if (!excelJson || excelJson.length === 0) {
            alert("The Excel file is empty or could not be read.");
            return;
        }

        setLoading(true);
        setLoadingMessage('AI is interpreting your Excel file...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const dataSample = excelJson.slice(0, 100);

            const prompt = `
                You are an expert data analyst specializing in trading journals. Your task is to interpret and standardize raw data from an Excel file into a structured JSON format. The user can upload any file, so you must be flexible.

                Here is the target JSON structure for each trade record. You must adhere to this structure:
                {
                  "date": "YYYY-MM-DD", "pair": "string", "lotSize": "number", "position": "'long' or 'short'",
                  "status": "'win', 'loss', or 'breakeven'", "pnl": "number (this is the profit or loss)", "commission": "number",
                  "session": "'asia', 'london', or 'new york'", "bias": "'bullish', 'bearish', or 'ranging'",
                  "confirmSmt": "boolean", "newsImpact": "'high', 'medium', 'low', or 'none'",
                  "emotion": "string", "grade": "'A', 'B', 'C', 'D', or 'F'", "notes": "string"
                }

                Here is the raw data from the user's Excel file: ${JSON.stringify(dataSample)}

                Please analyze the raw data. Identify the corresponding columns for each field in the target structure. Be intelligent about variations in column names (e.g., 'profit', 'P&L', 'net pnl' should all map to 'pnl'). For numeric fields, ensure they are numbers and handle currency symbols or commas. For enums like 'position' or 'status', pick the most likely value or a sensible default. If a crucial field like 'pnl' is completely missing, you can skip the record. Return ONLY a valid JSON array of trade objects that match the target structure.
            `;
            
            const responseSchema = {
                type: Type.ARRAY, items: {
                    type: Type.OBJECT, properties: {
                        date: { type: Type.STRING }, pair: { type: Type.STRING }, lotSize: { type: Type.NUMBER },
                        position: { type: Type.STRING }, status: { type: Type.STRING }, pnl: { type: Type.NUMBER },
                        commission: { type: Type.NUMBER }, session: { type: Type.STRING }, bias: { type: Type.STRING },
                        confirmSmt: { type: Type.BOOLEAN }, newsImpact: { type: Type.STRING }, emotion: { type: Type.STRING },
                        grade: { type: Type.STRING }, notes: { type: Type.STRING },
                    }
                }
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema }
            });

            const importedTrades = JSON.parse(response.text);

            if (Array.isArray(importedTrades) && importedTrades.length > 0) {
                const newTradesWithIds = importedTrades.map((trade, index) => ({
                    ...trade,
                    id: `ai-import-${Date.now()}-${index}`
                }));
                setTrades(prev => [...prev, ...newTradesWithIds]);
                alert(`Successfully imported ${newTradesWithIds.length} trades!`);
            } else {
                alert("AI could not find any valid trades in the file. Please check the file content and try again.");
            }

        } catch (error) {
            console.error("Error during AI Import:", error);
            alert("An error occurred during AI import. Please check the console for details.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const fileInput = event.target;
        if (!file) return;

        setLoading(true); setLoadingMessage('Reading your Excel file...');
        const reader = new FileReader();
        reader.onerror = () => {
            setLoading(false); alert('Error: Failed to read the file.');
            if (fileInput) fileInput.value = '';
        };
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = (window as any).XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = (window as any).XLSX.utils.sheet_to_json(worksheet);
                runAiImport(json);
            } catch (error) {
                setLoading(false);
                const errorMessage = error instanceof Error ? error.message : String(error);
                alert(`Error processing Excel file: ${errorMessage}`);
                console.error("Error processing Excel file:", error);
            } finally {
                if (fileInput) fileInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownload = () => {
        if (!analysisResult) {
            alert("Please run the AI Analysis first to generate a report.");
            return;
        }

        const wb = (window as any).XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryData = [
            { Metric: "Total Net PnL", Value: analysisResult.metrics.totalNetPnl },
            { Metric: "Total Profit", Value: analysisResult.metrics.totalProfit },
            { Metric: "Total Loss", Value: analysisResult.metrics.totalLoss },
            { Metric: "Win Rate", Value: analysisResult.metrics.winRate },
            { Metric: "Total Trades", Value: analysisResult.metrics.totalTrades },
            { Metric: "Total Commissions", Value: analysisResult.metrics.totalCommissions },
            { Metric: "Most Profitable Session", Value: analysisResult.metrics.mostProfitableSession },
            { Metric: "Best Performing Grade", Value: analysisResult.metrics.bestPerformingGrade },
        ];
        const summaryWs = (window as any).XLSX.utils.json_to_sheet(summaryData);
        (window as any).XLSX.utils.book_append_sheet(wb, summaryWs, "Analysis Summary");

        // 2. All Trades Sheet
        const allTradesWs = (window as any).XLSX.utils.json_to_sheet(trades);
        (window as any).XLSX.utils.book_append_sheet(wb, allTradesWs, "All Trades");
        
        // 3. Chart Data Sheets
        const cumulativePnlWsData = analysisResult.cumulativePnlData.labels.map((label, index) => ({ Date: label, "Cumulative PnL": analysisResult.cumulativePnlData.data[index] }));
        const cumulativePnlWs = (window as any).XLSX.utils.json_to_sheet(cumulativePnlWsData);
        (window as any).XLSX.utils.book_append_sheet(wb, cumulativePnlWs, "Cumulative PnL Data");

        const outcomeWsData = analysisResult.outcomeDistributionData.labels.map((label, index) => ({ Outcome: label, Count: analysisResult.outcomeDistributionData.data[index] }));
        const outcomeWs = (window as any).XLSX.utils.json_to_sheet(outcomeWsData);
        (window as any).XLSX.utils.book_append_sheet(wb, outcomeWs, "Outcome Distribution Data");

        const sessionWsData = analysisResult.sessionPnlData.labels.map((label, index) => ({ Session: label, "Net PnL": analysisResult.sessionPnlData.data[index] }));
        const sessionWs = (window as any).XLSX.utils.json_to_sheet(sessionWsData);
        (window as any).XLSX.utils.book_append_sheet(wb, sessionWs, "Session PnL Data");

        const gradeWsData = analysisResult.gradePnlData.labels.map((label, index) => ({ Grade: label, "Net PnL": analysisResult.gradePnlData.data[index] }));
        const gradeWs = (window as any).XLSX.utils.json_to_sheet(gradeWsData);
        (window as any).XLSX.utils.book_append_sheet(wb, gradeWs, "Grade PnL Data");

        (window as any).XLSX.writeFile(wb, "AI_Trading_Analysis.xlsx");
    };

    const runAiAnalysis = async () => {
        if (trades.length < 3) {
            alert("Please add at least 3 trades to run AI analysis.");
            return;
        }

        setLoading(true); setAnalysisResult(null);
        setLoadingMessage('AI is analyzing your trades...');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const tradesAsText = "date,pair,lotSize,position,status,pnl,commission,session,bias,confirmSmt,newsImpact,emotion,grade\n" + trades.map(t =>
                `${t.date},${t.pair},${t.lotSize},${t.position},${t.status},${t.pnl},${t.commission},${t.session},${t.bias},${t.confirmSmt},${t.newsImpact},"${t.emotion.replace(/"/g, '""')}","${t.grade}"`
            ).join('\n');
            
            const prompt = `
                Analyze the following trading journal data (CSV format):
                ${tradesAsText}

                Your response must be a valid JSON object matching the requested schema.
                - totalNetPnl: Sum of (pnl - commission). Format "Rp [amount]".
                - totalProfit: Sum of all positive pnl. Format "Rp [amount]".
                - totalLoss: Sum of all negative pnl (as a positive number). Format "Rp [amount]".
                - winRate: Percentage of trades where status is 'win'. Format "[rate]%".
                - mostProfitableSession: 'asia', 'london', or 'new york' with highest sum of (pnl - commission).
                - bestPerformingGrade: The grade with the highest sum of (pnl - commission).
                - cumulativePnlData: Object with labels (trade dates) and data (cumulative net PnL over time).
                - outcomeDistributionData: Object with labels (['Wins', 'Losses', 'Breakeven']) and data ([count of wins, count of losses, count of breakevens]).
                - sessionPnlData: Object with labels (['asia', 'london', 'new york']) and data ([sum net pnl for asia, sum net pnl for london, ...]).
                - gradePnlData: Object with labels (all unique grades found) and data ([sum net pnl for grade A, sum net pnl for grade B, ...]).
            `;
            
            setLoadingMessage('Waiting for Gemini API...');
            
            const responseSchema = {
                type: Type.OBJECT, properties: {
                    metrics: { type: Type.OBJECT, properties: {
                        totalNetPnl: { type: Type.STRING }, totalProfit: { type: Type.STRING }, totalLoss: { type: Type.STRING },
                        winRate: { type: Type.STRING }, totalTrades: { type: Type.INTEGER }, totalCommissions: { type: Type.STRING },
                        mostProfitableSession: { type: Type.STRING }, bestPerformingGrade: { type: Type.STRING },
                    }},
                    cumulativePnlData: { type: Type.OBJECT, properties: {
                        labels: { type: Type.ARRAY, items: { type: Type.STRING }}, data: { type: Type.ARRAY, items: { type: Type.NUMBER }},
                    }},
                    outcomeDistributionData: { type: Type.OBJECT, properties: {
                        labels: { type: Type.ARRAY, items: { type: Type.STRING }}, data: { type: Type.ARRAY, items: { type: Type.NUMBER }},
                    }},
                    sessionPnlData: { type: Type.OBJECT, properties: {
                        labels: { type: Type.ARRAY, items: { type: Type.STRING }}, data: { type: Type.ARRAY, items: { type: Type.NUMBER }},
                    }},
                    gradePnlData: { type: Type.OBJECT, properties: {
                        labels: { type: Type.ARRAY, items: { type: Type.STRING }}, data: { type: Type.ARRAY, items: { type: Type.NUMBER }},
                    }},
                },
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema }
            });

            const resultJson = JSON.parse(response.text);
            setAnalysisResult(resultJson);

        } catch (error) {
            console.error("Error with AI Analysis:", error);
            alert("An error occurred during AI analysis. Please check the console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {showIntro && (
                 <div className="intro-overlay">
                    <div className="intro-content">
                        <h1>Jurnal Trading</h1>
                        <p>oleh Khutveandy Rouf</p>
                    </div>
                </div>
            )}
            <div className={`app-container ${!showIntro ? 'fade-in' : ''}`}>
                {(loading && !showIntro) && (
                    <div className="loading-overlay">
                        <div className="spinner"></div><p>{loadingMessage}</p>
                    </div>
                )}
                <header><h1><span className="material-symbols-outlined">monitoring</span> AI Journal</h1></header>
                <main>
                    <div className="card"><TradeForm addTrade={addTrade} /></div>
                    <div className="actions-container">
                        <label htmlFor="file-upload" className="btn btn-secondary file-input-label">
                            <span className="material-symbols-outlined">upload_file</span> Import
                        </label>
                        <input id="file-upload" type="file" accept=".xls, .xlsx" onChange={handleFileUpload} className="file-input" />
                        <button onClick={handleDownload} className="btn btn-secondary" disabled={!analysisResult}>
                            <span className="material-symbols-outlined">download</span> Export Report
                        </button>
                        <button onClick={runAiAnalysis} className="btn btn-ai" disabled={loading || trades.length < 3}>
                            <span className="material-symbols-outlined">smart_toy</span> Run AI Analysis
                        </button>
                    </div>
                    {analysisResult && (
                        <div className="card analysis-section">
                            <h2>AI Analysis Dashboard</h2>
                            <MetricsGrid metrics={analysisResult.metrics} />
                            <div className="charts-grid">
                                <div className="chart-card"><h3>Cumulative Net PnL</h3><div className="chart-container"><canvas ref={cumulativeChartRef}></canvas></div></div>
                                <div className="chart-card"><h3>Outcome Distribution</h3><div className="chart-container"><canvas ref={outcomeChartRef}></canvas></div></div>
                                <div className="chart-card"><h3>PnL by Session</h3><div className="chart-container"><canvas ref={sessionChartRef}></canvas></div></div>
                                <div className="chart-card"><h3>PnL by Grade</h3><div className="chart-container"><canvas ref={gradeChartRef}></canvas></div></div>
                            </div>
                        </div>
                    )}
                    <div className="card trade-list-card">
                        <h2>Recent Trades</h2>
                        <TradeList trades={trades} />
                    </div>
                </main>
            </div>
        </>
    );
};

// --- Child Components ---

const TradeForm = ({ addTrade }: { addTrade: (trade: Omit<Trade, 'id'>) => void }) => {
    const initialFormState = {
        date: new Date().toISOString().substring(0, 10), pair: '', lotSize: '', position: 'long' as 'long' | 'short',
        status: 'win' as 'win' | 'loss' | 'breakeven', pnl: '', commission: '', session: 'london' as 'asia' | 'london' | 'new york',
        bias: 'ranging' as 'bullish' | 'bearish' | 'ranging', confirmSmt: false, newsImpact: 'low' as 'high' | 'medium' | 'low' | 'none',
        emotion: '', grade: 'C' as 'A' | 'B' | 'C' | 'D' | 'F', notes: '',
    };
    const [form, setForm] = useState(initialFormState);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setForm(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.pair || !form.pnl) {
            alert('Please fill at least Pair and PnL (Rp).');
            return;
        }
        addTrade({
            ...form,
            lotSize: parseFloat(form.lotSize) || 0,
            pnl: parseFloat(form.pnl),
            commission: parseFloat(form.commission) || 0,
        });
        setForm(initialFormState);
    };

    return (
        <form onSubmit={handleSubmit} className="trade-form">
            <div className="form-group"><label>Date</label><input type="date" name="date" value={form.date} onChange={handleChange} /></div>
            <div className="form-group"><label>Pair</label><input type="text" name="pair" placeholder="e.g., EURUSD" value={form.pair} onChange={handleChange} /></div>
            <div className="form-group"><label>Lot Size</label><input type="number" name="lotSize" placeholder="e.g., 0.1" value={form.lotSize} onChange={handleChange} /></div>
            <div className="form-group"><label>Position</label><select name="position" value={form.position} onChange={handleChange}><option value="long">Long</option><option value="short">Short</option></select></div>
            <div className="form-group"><label>Status</label><select name="status" value={form.status} onChange={handleChange}><option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option></select></div>
            <div className="form-group"><label>PnL (Rp)</label><input type="number" name="pnl" placeholder="e.g., 150000" value={form.pnl} onChange={handleChange} /></div>
            <div className="form-group"><label>Komisi (Rp)</label><input type="number" name="commission" placeholder="e.g., 15000" value={form.commission} onChange={handleChange} /></div>
            <div className="form-group"><label>Session</label><select name="session" value={form.session} onChange={handleChange}><option value="asia">Asia</option><option value="london">London</option><option value="new york">New York</option></select></div>
            <div className="form-group"><label>Bias</label><select name="bias" value={form.bias} onChange={handleChange}><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="ranging">Ranging</option></select></div>
            <div className="form-group"><label>News Impact</label><select name="newsImpact" value={form.newsImpact} onChange={handleChange}><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
            <div className="form-group"><label>Emotion</label><input type="text" name="emotion" placeholder="e.g., Confident" value={form.emotion} onChange={handleChange} /></div>
            <div className="form-group"><label>Grade</label><select name="grade" value={form.grade} onChange={handleChange}><option>A</option><option>B</option><option>C</option><option>D</option><option>F</option></select></div>
            <div className="form-group checkbox-group"><label htmlFor="confirmSmt">Confirm SMT</label><input id="confirmSmt" type="checkbox" name="confirmSmt" checked={form.confirmSmt} onChange={handleChange} /></div>
            <div className="form-group full-width"><label>Notes</label><textarea name="notes" placeholder="Trade analysis and thoughts..." value={form.notes} onChange={handleChange}></textarea></div>
            <button type="submit" className="btn btn-primary full-width">Add Trade</button>
        </form>
    );
};

const TradeList = ({ trades }: { trades: Trade[] }) => {
    if (trades.length === 0) {
        return (
            <div className="trade-list-container">
                <div className="empty-state">
                    <span className="material-symbols-outlined">work_history</span>
                    <h3>No Trades Yet</h3><p>Add a trade or import from an Excel file.</p>
                </div>
            </div>
        );
    }
    return (
        <div className="trade-list-container">
            {[...trades].reverse().map(trade => <TradeItem key={trade.id} trade={trade} />)}
        </div>
    );
};

const TradeItem: React.FC<{ trade: Trade }> = ({ trade }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const netPnl = trade.pnl - trade.commission;
    const isProfit = netPnl >= 0;
    const statusColor = trade.status === 'win' ? 'pnl-positive' : trade.status === 'loss' ? 'pnl-negative' : 'pnl-neutral';

    return (
        <div className="trade-item">
            <div className="trade-item-main" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="trade-info">
                    <div className="trade-symbol">
                        {trade.pair}
                        <span className={`trade-type ${trade.position === 'long' ? 'trade-type-buy' : 'trade-type-sell'}`}>{trade.position}</span>
                    </div>
                    <div className="trade-details">{trade.date} | {trade.session} session</div>
                </div>
                <div className="trade-pnl-section">
                     <div className={`trade-pnl ${statusColor}`}>
                        {isProfit ? '+' : ''}Rp {netPnl.toLocaleString('id-ID')}
                    </div>
                     <button className="expand-btn">
                        <span className="material-symbols-outlined">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                    </button>
                </div>
            </div>
            {isExpanded && (
                <div className="trade-item-details">
                    <div><strong>Lot Size:</strong> <span>{trade.lotSize}</span></div>
                    <div><strong>Grade:</strong> <span>{trade.grade}</span></div>
                    <div><strong>Bias:</strong> <span>{trade.bias}</span></div>
                    <div><strong>Emotion:</strong> <span>{trade.emotion || '-'}</span></div>
                    <div><strong>News:</strong> <span>{trade.newsImpact}</span></div>
                    <div><strong>SMT:</strong> <span>{trade.confirmSmt ? 'Yes' : 'No'}</span></div>
                    <div className="full-width"><strong>Gross PnL:</strong> <span>Rp {trade.pnl.toLocaleString('id-ID')}</span></div>
                    <div className="full-width"><strong>Commission:</strong> <span>Rp {trade.commission.toLocaleString('id-ID')}</span></div>
                    {trade.notes && <div className="full-width notes"><strong>Notes:</strong> <span>{trade.notes}</span></div>}
                </div>
            )}
        </div>
    );
};

const MetricsGrid = ({ metrics }: { metrics: AnalysisMetrics }) => (
    <div className="metrics-grid">
        <MetricCard label="Total Net PnL" value={metrics.totalNetPnl} icon="account_balance_wallet" />
        <MetricCard label="Win Rate" value={metrics.winRate} icon="trending_up" />
        <MetricCard label="Total Profit" value={metrics.totalProfit} icon="add_card" />
        <MetricCard label="Total Loss" value={metrics.totalLoss} icon="credit_card_off" />
        <MetricCard label="Best Session" value={metrics.mostProfitableSession} icon="schedule" />
        <MetricCard label="Best Grade" value={metrics.bestPerformingGrade} icon="grade" />
        <MetricCard label="Total Trades" value={metrics.totalTrades.toString()} icon="functions" />
        <MetricCard label="Total Fees" value={metrics.totalCommissions} icon="receipt_long" />
    </div>
);

const MetricCard = ({ label, value, icon }: { label: string, value: string, icon: string }) => (
    <div className="metric-card">
         <div className="metric-icon"><span className="material-symbols-outlined">{icon}</span></div>
        <div className="metric-content"><div className="label">{label}</div><div className="value">{value}</div></div>
    </div>
);

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
