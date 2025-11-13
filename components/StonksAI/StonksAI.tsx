"use client";

import './StonksAI.css';
import React, { useState, useEffect, useRef } from 'react';

// --- Types ---
type Sender = 'bot' | 'user';

interface SentimentData {
    sentiment?: string;
    summary?: string;
    key_points?: string[];
}

interface Filing {
    ticker?: string;
    form_type?: string;
    filing_date?: string;
    summary?: string;
    url?: string;
}

interface Article {
    ticker?: string;
    headline?: string;
    summary?: string;
    sentiment?: string;
}

interface Profile {
    description?: string;
    industry?: string;
    ceo?: string;
    headquarters?: string;
    website?: string;
}

interface ModalContent {
    title: string;
    summary: string;
    takeaways: string[];
}

// Discriminated union for messages - TypeScript will narrow based on 'type'
type Message =
    | { sender: Sender; type: 'text'; content: string }
    | { sender: Sender; type: 'sentiment'; content: SentimentData; stockTicker: string }
    | { sender: Sender; type: 'filing'; content: Filing; stockTicker: string }
    | { sender: Sender; type: 'action_options'; stockTicker: string }
    | { sender: Sender; type: 'filing_list'; content: Filing[]; stockTicker: string }
    | { sender: Sender; type: 'profile'; content: Profile; stockTicker: string };

// Client -> Server proxy helper. The server route (app/api/ai/generate) holds
// the GoogleGenAI client and the API key so secrets remain server-side.
async function callAi(payload: { model: string; contents: string; config?: Record<string, unknown> }) {
    const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 429 || errorData.rateLimitExceeded) {
            throw new Error('RATE_LIMIT');
        }
        const txt = errorData.error || `HTTP ${res.status}`;
        throw new Error(txt);
    }

    return res.json(); // expected: { text: string }
}

    // --- Helper Functions ---
    const parseStockTicker = (text: string) => {
        const tickerRegex = /(?:[A-Z]{1,5})/;
        const upperCaseText = text.toUpperCase();
        const match = upperCaseText.match(tickerRegex);
        return match ? match[0] : null;
    };

    const parseUserIntent = (text: string) => {
        const lowerCaseText = text.toLowerCase();
        if (
            lowerCaseText.includes('filing') ||
            lowerCaseText.includes('sec') ||
            lowerCaseText.includes('report') ||
            lowerCaseText.includes('10-k') ||
            lowerCaseText.includes('8-k')
        ) {
            return 'filing';
        }
        if (
            lowerCaseText.includes('profile') ||
            lowerCaseText.includes('company') ||
            lowerCaseText.includes('about')
        ) {
            return 'profile';
        }
        return 'sentiment';
    };

    // --- React subcomponents (kept lightweight) ---
    const TypingIndicator = () => (
        <div className="message bot">
            <div className="message-content">
                <div className="typing-indicator" aria-label="Bot is typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    );

    const SentimentCard = ({ sentimentData, stockTicker }: { sentimentData?: SentimentData; stockTicker?: string }) => {
        const { sentiment, summary, key_points } = sentimentData || {};
        const sentimentClass = (sentiment || 'NEUTRAL').toUpperCase();
        
        // Handle key_points which might be strings or objects
        const renderKeyPoint = (p: any, i: number) => {
            if (typeof p === 'string') {
                return <li key={i}>{p}</li>;
            } else if (typeof p === 'object' && p !== null) {
                // Handle object format like {point: "...", elaboration: "..."}
                const pointText = p.point || p.elaboration || JSON.stringify(p);
                return <li key={i}>{pointText}</li>;
            }
            return null;
        };
        
        return (
            <div className={`sentiment-card ${sentimentClass}`}>
                <div className="sentiment-header">
                    <h3 className="sentiment-ticker">{stockTicker}</h3>
                    <span className={`sentiment-badge ${sentimentClass}`}>{sentimentClass}</span>
                </div>
                <p className="sentiment-summary">{summary}</p>
                {key_points && key_points.length > 0 && (
                    <>
                        <h4 className="key-points-heading">Key Points:</h4>
                        <ul className="key-points-list">
                            {key_points.map(renderKeyPoint)}
                        </ul>
                    </>
                )}
            </div>
        );
    };

    const FilingMessageCard = ({ filingData, stockTicker }: { filingData?: Filing; stockTicker?: string }) => {
        const { form_type, filing_date, summary, url } = filingData || {};
        return (
            <div className="filing-message-card">
                <div className="filing-message-header">
                    <div className="filing-title-group">
                        <h3 className="filing-ticker">{stockTicker}</h3>
                        <span className="filing-form-badge">Form {form_type}</span>
                    </div>
                    <span className="filing-date-badge">{filing_date}</span>
                </div>
                <p className="filing-summary">{summary}</p>
                {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="filing-link">
                        📄 View Full Filing on SEC.gov
                    </a>
                )}
            </div>
        );
    };

    const CompanyProfileCard = ({ profileData, stockTicker }: { profileData?: Profile; stockTicker?: string }) => {
        const { description, industry, ceo, headquarters, website } = profileData || {};
        return (
            <div className="company-profile-card">
                <div className="profile-header">
                    <h3 className="profile-ticker">{stockTicker}</h3>
                    <span className="profile-label">Company Profile</span>
                </div>
                <div className="profile-grid">
                    <div className="profile-item">
                        <strong className="profile-item-label">Industry</strong>
                        <span className="profile-item-value">{industry}</span>
                    </div>
                    <div className="profile-item">
                        <strong className="profile-item-label">CEO</strong>
                        <span className="profile-item-value">{ceo}</span>
                    </div>
                    <div className="profile-item">
                        <strong className="profile-item-label">Headquarters</strong>
                        <span className="profile-item-value">{headquarters}</span>
                    </div>
                    {website && (
                        <div className="profile-item">
                            <strong className="profile-item-label">Website</strong>
                            <span className="profile-item-value">
                                <a href={website} target="_blank" rel="noopener noreferrer" className="profile-link">
                                    🔗 {website}
                                </a>
                            </span>
                        </div>
                    )}
                </div>
                {description && (
                    <>
                        <h4 className="profile-description-heading">About</h4>
                        <p className="profile-description">{description}</p>
                    </>
                )}
            </div>
        );
    };

    const ActionOptions = ({ stockTicker, onOptionClick }: { stockTicker?: string; onOptionClick: (ticker: string, option: string) => void }) => {
        const options = [
            { label: 'Company Profile', type: 'profile' },
            { label: 'Last 10 Filings', type: 'last_10' },
            { label: 'Earnings Reports', type: 'earnings' },
            { label: 'Insider Transactions', type: 'insider' },
            { label: 'Latest 10-Q', type: '10-Q' },
            { label: 'Latest 10-K', type: '10-K' },
            { label: 'Latest 13F', type: '13F' },
            { label: 'Mergers/Acquisitions', type: 'merger' },
        ];
        return (
            <div className="action-options-card">
                <p>What else would you like to see for {stockTicker}?</p>
                <div className="action-options-buttons">
                    {options.map((opt) => (
                        <button key={opt.type} onClick={() => onOptionClick(stockTicker ?? '', opt.type)} className="action-option-button">
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const FilingListCard = ({ filings, stockTicker }: { filings?: Filing[]; stockTicker?: string }) => (
        <div className="filing-list-card">
            <h3>Recent Filings for {stockTicker}</h3>
            {filings?.map((filing: Filing, index: number) => (
                <div key={index} className="filing-list-item">
                    <div className="filing-message-header">
                        <h4>Form {filing.form_type}</h4>
                        <span>{filing.filing_date}</span>
                    </div>
                    <p>{filing.summary}</p>
                    {filing.url && (
                        <a href={filing.url} target="_blank" rel="noopener noreferrer">View Filing</a>
                    )}
                </div>
            ))}
        </div>
    );

    const SummaryModal = ({ isOpen, isLoading, content, onClose }: { isOpen: boolean; isLoading: boolean; content: ModalContent; onClose: () => void }) => {
        if (!isOpen) return null;
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>{content.title}</h2>
                        <button className="modal-close-button" onClick={onClose} aria-label="Close modal">&times;</button>
                    </div>
                    <div className="modal-body">
                        {isLoading ? (
                            <div className="modal-loader"></div>
                        ) : (
                            <>
                                <p>{content.summary}</p>
                                {content.takeaways && content.takeaways.length > 0 && (
                                    <div className="modal-takeaways">
                                        <h4>Key Takeaways</h4>
                                        <ul>
                                            {content.takeaways.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const StonksAI = ({ tickers = [] }: { tickers?: string[] }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [news, setNews] = useState<Article[]>([]);
    const [filings, setFilings] = useState<Filing[]>([]);
        const [isLoading, setIsLoading] = useState(false);
        const [isNewsLoading, setIsNewsLoading] = useState(false);
        const [isFilingsLoading, setIsFilingsLoading] = useState(false);
        const [inputValue, setInputValue] = useState('');
        const [newsSentimentFilter, setNewsSentimentFilter] = useState('All');
        const [newsTickerFilter, setNewsTickerFilter] = useState('All');
        const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
        const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContent>({ title: '', summary: '', takeaways: [] });
        const [isModalLoading, setIsModalLoading] = useState(false);

        const chatEndRef = useRef<HTMLDivElement | null>(null);

        useEffect(() => {
            // Don't show initial message, let user start fresh
            setMessages([]);
        }, []);

        useEffect(() => {
            if (!tickers.includes(newsTickerFilter) && newsTickerFilter !== 'All') {
                setNewsTickerFilter('All');
            }
        }, [tickers, newsTickerFilter]);

        useEffect(() => {
            const fetchNewsForPortfolio = async (portfolioTickers: string[]) => {
                if (portfolioTickers.length === 0) {
                    setNews([]);
                    return;
                }
                setIsNewsLoading(true);
                try {
                    const response = await callAi({
                        model: 'gemini-2.5-flash',
                        contents: `Provide the top 10 recent news headlines for the following stock tickers: ${portfolioTickers.join(', ')}. For each article, include the stock ticker, a brief one-sentence summary, and the overall sentiment ('POSITIVE', 'NEGATIVE', or 'NEUTRAL').`,
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: 'object',
                                properties: {
                                    articles: {
                                        type: 'array',
                                        description: 'A list of recent news articles.',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                ticker: { type: 'string' },
                                                headline: { type: 'string' },
                                                summary: { type: 'string' },
                                                sentiment: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });

                    const newsData = JSON.parse(response.text || '{}');
                    setNews(newsData.articles || []);
                } catch (err) {
                    console.error('Error fetching news:', err);
                    setNews([]);
                } finally {
                    setIsNewsLoading(false);
                }
            };

            fetchNewsForPortfolio(tickers || []);
        }, [tickers]);

        useEffect(() => {
            const fetchFilingsForPortfolio = async (portfolioTickers: string[]) => {
                if (portfolioTickers.length === 0) {
                    setFilings([]);
                    return;
                }
                setIsFilingsLoading(true);
                try {
                    const response = await callAi({
                        model: 'gemini-2.5-flash',
                        contents: `Provide the top 5 most recent and important SEC filings (like 8-K, 10-K, 10-Q) for the following stock tickers: ${portfolioTickers.join(', ')}. For each filing, include the stock ticker, the form type, the filing date, and a brief one-sentence summary.`,
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: 'object',
                                properties: {
                                    filings: {
                                        type: 'array',
                                        description: 'A list of recent SEC filings.',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                ticker: { type: 'string' },
                                                form_type: { type: 'string' },
                                                filing_date: { type: 'string' },
                                                summary: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });

                    const filingsData = JSON.parse(response.text || '{}');
                    setFilings(filingsData.filings || []);
                } catch (err) {
                    console.error('Error fetching SEC filings:', err);
                    setFilings([]);
                } finally {
                    setIsFilingsLoading(false);
                }
            };

            fetchFilingsForPortfolio(tickers || []);
        }, [tickers]);

        useEffect(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, [messages, isLoading]);

        const fetchSentimentAnalysis = async (stockTicker: string) => {
            setIsLoading(true);
            setMessages((prev) => [...prev, { sender: 'user', type: 'text', content: `Analyze sentiment for ${stockTicker}` }]);
            try {
                const response = await callAi({
                    model: 'gemini-2.5-flash',
                    contents: `You are a specialized stock market analysis chatbot. Based on recent public news and financial data, perform a sentiment analysis for the stock with the ticker symbol: ${stockTicker}. Provide a concise summary and 3-5 key bullet points supporting your analysis.`,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'object',
                            properties: {
                                sentiment: { type: 'string' },
                                summary: { type: 'string' },
                                key_points: { type: 'array', items: { type: 'string' } }
                            }
                        }
                    }
                });

                const sentimentData = JSON.parse(response.text || '{}');
                setMessages((prev) => [...prev, { sender: 'bot', type: 'sentiment', content: sentimentData, stockTicker }]);
            } catch (err: any) {
                console.error('Error fetching sentiment analysis:', err);
                const errorMessage = err?.message?.includes('RATE_LIMIT') 
                    ? `⏱️ Rate limit reached. Please wait about 30 seconds before trying again.`
                    : `Sorry, I couldn't retrieve the analysis for ${stockTicker}.`;
                setMessages((prev) => [...prev, { sender: 'bot', type: 'text', content: errorMessage }]);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchLatestFiling = async (stockTicker: string) => {
            setIsLoading(true);
            setMessages((prev) => [...prev, { sender: 'user', type: 'text', content: `Get latest SEC filing for ${stockTicker}` }]);
            try {
                const response = await callAi({
                    model: 'gemini-2.5-flash',
                    contents: `Provide details for the single most recent important SEC filing (like 8-K, 10-K, 10-Q) for the stock ticker: ${stockTicker}. Include the form type, the filing date, a brief one-sentence summary, and the direct URL to the filing on the SEC EDGAR website.`,
                    config: { responseMimeType: 'application/json' }
                });
                const filingData = JSON.parse(response.text || '{}');
                setMessages((prev) => [...prev, { sender: 'bot', type: 'filing', content: filingData, stockTicker }, { sender: 'bot', type: 'action_options', stockTicker }]);
            } catch (err: any) {
                console.error('Error fetching latest filing:', err);
                const errorMessage = err?.message?.includes('RATE_LIMIT') 
                    ? `⏱️ Rate limit reached. Please wait about 30 seconds before trying again.`
                    : `Sorry, I couldn't retrieve the latest filing for ${stockTicker}.`;
                setMessages((prev) => [...prev, { sender: 'bot', type: 'text', content: errorMessage }]);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchCompanyProfile = async (stockTicker: string) => {
            setIsLoading(true);
            setMessages((prev) => [...prev, { sender: 'user', type: 'text', content: `Get company profile for ${stockTicker}` }]);
            try {
                const response = await callAi({
                    model: 'gemini-2.5-flash',
                    contents: `Provide a company profile for the stock ticker: ${stockTicker}. Include its business description, industry, current CEO, headquarters location, and official website URL.`,
                    config: { 
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: 'object',
                            properties: {
                                description: { type: 'string' },
                                industry: { type: 'string' },
                                ceo: { type: 'string' },
                                headquarters: { type: 'string' },
                                website: { type: 'string' }
                            }
                        }
                    }
                });
                const profileData = JSON.parse(response.text || '{}');
                setMessages((prev) => [...prev, { sender: 'bot', type: 'profile', content: profileData, stockTicker }, { sender: 'bot', type: 'action_options', stockTicker }]);
            } catch (err: any) {
                console.error('Error fetching company profile:', err);
                const errorMessage = err?.message?.includes('RATE_LIMIT') 
                    ? `⏱️ Rate limit reached. Please wait about 30 seconds before trying again.`
                    : `Sorry, I couldn't retrieve the company profile for ${stockTicker}.`;
                setMessages((prev) => [...prev, { sender: 'bot', type: 'text', content: errorMessage }]);
            } finally {
                setIsLoading(false);
            }
        };

        const handleActionOptionClick = async (stockTicker: string, option: string) => {
            const userMessageMap: Record<string, string> = {
                profile: `Get company profile for ${stockTicker}`,
                last_10: `Get last 10 filings for ${stockTicker}`,
                earnings: `Find latest earnings report for ${stockTicker}`,
                insider: `Find recent insider transactions for ${stockTicker}`,
                '10-Q': `Get latest 10-Q for ${stockTicker}`,
                '10-K': `Get latest 10-K for ${stockTicker}`,
                '13F': `Get latest 13F for ${stockTicker}`,
                merger: `Find merger/acquisition filings for ${stockTicker}`,
            };

            setMessages((prev) => [...prev.filter((m) => m.type !== 'action_options'), { sender: 'user', type: 'text', content: userMessageMap[option] }]);
            setIsLoading(true);

            const newBotMessages: Message[] = [];
            try {
                let prompt = '';
                let responseSchema: Record<string, unknown> | undefined;
                let responseType = 'filing';

                switch (option) {
                    case 'profile':
                        responseType = 'profile';
                        prompt = `Provide a company profile for the stock ticker: ${stockTicker}. Include its business description, industry, current CEO, headquarters location, and official website URL.`;
                        responseSchema = {
                            type: 'object',
                            properties: {
                                description: { type: 'string' },
                                industry: { type: 'string' },
                                ceo: { type: 'string' },
                                headquarters: { type: 'string' },
                                website: { type: 'string' }
                            }
                        };
                        break;
                    case 'last_10':
                        responseType = 'filing_list';
                        prompt = `Provide a list of the 10 most recent important SEC filings for ${stockTicker}. For each, include form type, filing date, a one-sentence summary, and the direct URL to the filing's index page on the SEC EDGAR website.`;
                        responseSchema = {
                            type: 'object',
                            properties: {
                                filings: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            ticker: { type: 'string' },
                                            form_type: { type: 'string' },
                                            filing_date: { type: 'string' },
                                            summary: { type: 'string' },
                                            url: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        };
                        break;
                    default:
                        prompt = option;
                }

                const response = await callAi({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema } });
                const responseData = JSON.parse(response.text || '{}') as Record<string, unknown>;

                if (responseType === 'filing_list') {
                    const filingsList = (responseData.filings as Filing[] | undefined) || [];
                    newBotMessages.push({ sender: 'bot', type: 'filing_list', content: filingsList, stockTicker });
                } else if (responseType === 'profile') {
                    newBotMessages.push({ sender: 'bot', type: 'profile', content: responseData as Profile, stockTicker });
                } else {
                    const summary = (responseData.summary as string | undefined) || '';
                    if (summary && !summary.toLowerCase().includes('no recent')) {
                        newBotMessages.push({ sender: 'bot', type: 'filing', content: responseData as Filing, stockTicker });
                    } else {
                        newBotMessages.push({ sender: 'bot', type: 'text', content: summary || `No recent ${option} filing found for ${stockTicker}.` });
                    }
                }
            } catch (err) {
                console.error(`Error fetching for option ${option}:`, err);
                newBotMessages.push({ sender: 'bot', type: 'text', content: `Sorry, I couldn't retrieve that information for ${stockTicker}.` });
            } finally {
                newBotMessages.push({ sender: 'bot', type: 'action_options', stockTicker });
                setMessages((prev) => [...prev, ...newBotMessages]);
                setIsLoading(false);
            }
        };

        const handleNewsClick = async (newsItem: Article) => {
            setModalContent({ title: newsItem.headline || '', summary: '', takeaways: [] });
            setIsModalOpen(true);
            setIsModalLoading(true);
            try {
                const response = await callAi({
                    model: 'gemini-2.5-flash',
                    contents: `Based on the headline: "${newsItem.headline}" and the initial summary: "${newsItem.summary}", please provide a more detailed, expanded summary of the news article AND a list of 3-5 key takeaways as bullet points. Elaborate on the key points and the potential impact on the stock.`,
                    config: { responseMimeType: 'application/json' }
                });
                const summaryData = JSON.parse(response.text || '{}') as Record<string, unknown>;
                setModalContent((p) => ({ ...p, summary: (summaryData.detailed_summary as string) || (summaryData.detailedSummary as string) || '', takeaways: (summaryData.key_takeaways as string[]) || (summaryData.keyTakeaways as string[]) || [] }));
            } catch (err) {
                console.error('Error fetching detailed summary:', err);
                setModalContent((p) => ({ ...p, summary: "Sorry, I couldn't generate a detailed summary at this time.", takeaways: [] }));
            } finally {
                setIsModalLoading(false);
            }
        };

        const handleFilingClick = async (filing: Filing) => {
            const title = `${filing.ticker} - Form ${filing.form_type} (${filing.filing_date})`;
            setModalContent({ title, summary: '', takeaways: [] });
            setIsModalOpen(true);
            setIsModalLoading(true);
            try {
                const response = await callAi({ model: 'gemini-2.5-flash', contents: `Please provide a detailed summary AND a list of 3-5 key takeaways for the SEC filing with the following details: Ticker: ${filing.ticker}, Form Type: ${filing.form_type}, Filing Date: ${filing.filing_date}, Initial Summary: "${filing.summary}". Explain the key points and potential impact on the stock.`, config: { responseMimeType: 'application/json' } });
                const summaryData = JSON.parse(response.text || '{}') as Record<string, unknown>;
                setModalContent((p) => ({ ...p, summary: (summaryData.detailed_summary as string) || '', takeaways: (summaryData.key_takeaways as string[]) || [] }));
            } catch (err) {
                console.error('Error fetching detailed filing summary:', err);
                setModalContent((p) => ({ ...p, summary: "Sorry, I couldn't generate a detailed summary for this filing.", takeaways: [] }));
            } finally {
                setIsModalLoading(false);
            }
        };

        const handleSendMessage = (e: React.FormEvent) => {
            e.preventDefault();
            if (!inputValue.trim() || isLoading) return;
            const stockTicker = parseStockTicker(inputValue);
            const intent = parseUserIntent(inputValue);
            if (stockTicker) {
                if (intent === 'filing') fetchLatestFiling(stockTicker);
                else if (intent === 'profile') fetchCompanyProfile(stockTicker);
                else fetchSentimentAnalysis(stockTicker);
            } else {
                setMessages((prev) => [...prev, { sender: 'user', type: 'text', content: inputValue }, { sender: 'bot', type: 'text', content: "I can help with sentiment analysis, company profiles, or SEC filings. Please provide a valid stock ticker (e.g., 'sentiment for TSLA', 'AAPL profile', or 'latest GOOGL filing')." }]);
            }
            setInputValue('');
        };

        const handleTickerClick = (ticker: string) => {
            if (isLoading) return;
            fetchSentimentAnalysis(ticker);
        };

        const filteredNews = news.filter((item) => (newsSentimentFilter === 'All' || item.sentiment?.toUpperCase() === newsSentimentFilter.toUpperCase()) && (newsTickerFilter === 'All' || item.ticker?.toUpperCase() === newsTickerFilter.toUpperCase()));

            return (
                <div className="container">
                <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="sidebar-section">
                        <h2>Portfolio Holdings</h2>
                        <p>Click a ticker to begin your analysis.</p>
                        <ul className="watchlist-items">
                            {tickers.map((ticker) => (
                                <li key={ticker} className="watchlist-item" onClick={() => handleTickerClick(ticker)} tabIndex={0} role="button" aria-label={`Get analysis for ${ticker}`}>
                                    <span>{ticker}</span>
                                </li>
                            ))}
                            {tickers.length === 0 && <div className="sidebar-message">No holdings to display.</div>}
                        </ul>
                    </div>
                    <div className="sidebar-section">
                        <div className="sidebar-header-with-filters">
                            <h2>Recent News</h2>
                            <div className="filter-controls">
                                <select className="news-filter" value={newsTickerFilter} onChange={(e) => setNewsTickerFilter(e.target.value)} aria-label="Filter news by stock ticker">
                                    <option value="All">All Tickers</option>
                                    {tickers.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select className="news-filter" value={newsSentimentFilter} onChange={(e) => setNewsSentimentFilter(e.target.value)} aria-label="Filter news by sentiment">
                                    <option value="All">All Sentiments</option>
                                    <option value="POSITIVE">Positive</option>
                                    <option value="NEGATIVE">Negative</option>
                                    <option value="NEUTRAL">Neutral</option>
                                </select>
                            </div>
                        </div>
                        <div className="news-items">
                            {isNewsLoading ? <div className="sidebar-message">Loading news...</div> : tickers.length === 0 ? <div className="sidebar-message">Add stocks to see news.</div> : news.length === 0 ? <div className="sidebar-message">No recent news found.</div> : filteredNews.length === 0 ? <div className="sidebar-message">No news matches the filters.</div> : filteredNews.map((item, idx) => (
                                <div key={idx} className="news-item-clickable" onClick={() => handleNewsClick(item)} tabIndex={0} role="button" aria-label={`Get summary for ${item.headline}`}>
                                    <div className="news-item">
                                        <div className="news-item-header">
                                            <span className="news-ticker-badge">{item.ticker}</span>
                                            <span className={`sentiment-badge-sidebar ${item.sentiment?.toUpperCase()}`}>{item.sentiment}</span>
                                        </div>
                                        <h4 className="news-headline">{item.headline}</h4>
                                        <p className="news-summary">{item.summary}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="sidebar-section">
                        <h2>SEC Filings</h2>
                        <div className="filings-items">
                            {isFilingsLoading ? <div className="sidebar-message">Loading filings...</div> : tickers.length === 0 ? <div className="sidebar-message">Add stocks to see filings.</div> : filings.length === 0 ? <div className="sidebar-message">No recent filings found.</div> : filings.map((item, idx) => (
                                <div key={idx} className="filing-item-clickable" onClick={() => handleFilingClick(item)} tabIndex={0} role="button" aria-label={`Get summary for ${item.ticker} ${item.form_type} filing`}>
                                    <div className="filing-item">
                                        <div className="filing-item-header">
                                            <span className="filing-ticker-badge">{item.ticker}</span>
                                            <span className="filing-form-badge">{item.form_type}</span>
                                        </div>
                                        <p className="filing-date">{item.filing_date}</p>
                                        <p className="filing-summary">{item.summary}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
                <main className="chat-container">
                    <header className="chat-header">
                        <button className="sidebar-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} aria-label="Toggle sidebar" title="Toggle sidebar">
                            {isSidebarCollapsed ? '»' : '«'}
                        </button>
                        <h1>StonksAI</h1>
                    </header>
                    <div className="chat-messages">
                        {messages.length === 0 && (
                            <div className="welcome-card">
                                <div className="welcome-icon">✨</div>
                                <h2 className="welcome-title">Welcome to StonksAI</h2>
                                <p className="welcome-subtitle">Your AI-powered portfolio analyst</p>
                                <div className="welcome-suggestions">
                                    <div className="suggestion-card" onClick={() => setInputValue(tickers[0] ? `${tickers[0]} sentiment` : 'AAPL sentiment')}>
                                        <span className="suggestion-icon">📊</span>
                                        <span className="suggestion-text">Get sentiment analysis</span>
                                    </div>
                                    <div className="suggestion-card" onClick={() => setInputValue(tickers[0] ? `${tickers[0]} filing` : 'TSLA filing')}>
                                        <span className="suggestion-icon">📄</span>
                                        <span className="suggestion-text">View SEC filings</span>
                                    </div>
                                    <div className="suggestion-card" onClick={() => setInputValue(tickers[0] ? `${tickers[0]} profile` : 'AAPL profile')}>
                                        <span className="suggestion-icon">🏢</span>
                                        <span className="suggestion-text">Company profile</span>
                                    </div>
                                </div>
                                <p className="welcome-tip">💡 Click a stock from your portfolio holdings on the left to start</p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.sender}`}>
                                        {msg.type === 'sentiment' ? (
                                            <SentimentCard sentimentData={msg.content} stockTicker={msg.stockTicker} />
                                        ) : msg.type === 'filing' ? (
                                            <FilingMessageCard filingData={msg.content} stockTicker={msg.stockTicker} />
                                        ) : msg.type === 'action_options' ? (
                                            <ActionOptions stockTicker={msg.stockTicker} onOptionClick={handleActionOptionClick} />
                                        ) : msg.type === 'filing_list' ? (
                                            <FilingListCard filings={msg.content} stockTicker={msg.stockTicker} />
                                        ) : msg.type === 'profile' ? (
                                            <CompanyProfileCard profileData={msg.content} stockTicker={msg.stockTicker} />
                                        ) : (
                                            <div className="message-content">{msg.content}</div>
                                        )}
                            </div>
                        ))}
                        {isLoading && <TypingIndicator />}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="chat-input">
                        <form onSubmit={handleSendMessage}>
                            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask about a stock..." aria-label="Chat input" disabled={isLoading} />
                            <button type="submit" disabled={isLoading}>Send</button>
                        </form>
                    </div>
                </main>
                <SummaryModal isOpen={isModalOpen} isLoading={isModalLoading} content={modalContent} onClose={() => setIsModalOpen(false)} />
            </div>
        );
    };

    export default StonksAI;