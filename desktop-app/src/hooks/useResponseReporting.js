import { useState, useEffect } from 'react';

export const useResponseReporting = () => {
    const [reports, setReports] = useState([]);
    const [reportingSettings, setReportingSettings] = useState({
        enabled: true,
        autoBlock: false,
        feedbackEndpoint: null
    });

    // Load reports and settings from localStorage
    useEffect(() => {
        try {
            const savedReports = localStorage.getItem('mench-ai-reports');
            if (savedReports) {
                setReports(JSON.parse(savedReports));
            }

            const savedSettings = localStorage.getItem('mench-ai-reporting-settings');
            if (savedSettings) {
                setReportingSettings(JSON.parse(savedSettings));
            }
        } catch (error) {
            console.error('Error loading reporting data:', error);
        }
    }, []);

    // Save reports to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('mench-ai-reports', JSON.stringify(reports));
        } catch (error) {
            console.error('Error saving reports:', error);
        }
    }, [reports]);

    // Save settings to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('mench-ai-reporting-settings', JSON.stringify(reportingSettings));
        } catch (error) {
            console.error('Error saving reporting settings:', error);
        }
    }, [reportingSettings]);

    const submitReport = async (report) => {
        try {
            // Add report to local storage
            const newReport = {
                ...report,
                id: Date.now().toString(),
                status: 'pending'
            };
            setReports(prev => [...prev, newReport]);

            // If feedback endpoint is configured, send to server
            if (reportingSettings.feedbackEndpoint) {
                try {
                    const response = await fetch(reportingSettings.feedbackEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(newReport)
                    });

                    if (response.ok) {
                        // Update report status to submitted
                        setReports(prev => 
                            prev.map(r => 
                                r.id === newReport.id 
                                    ? { ...r, status: 'submitted' }
                                    : r
                            )
                        );
                    }
                } catch (networkError) {
                    console.error('Network error submitting report:', networkError);
                    // Report is still saved locally even if network fails
                }
            }

            return newReport;
        } catch (error) {
            console.error('Error submitting report:', error);
            throw error;
        }
    };

    const getReportStats = () => {
        const totalReports = reports.length;
        const reportsByType = reports.reduce((acc, report) => {
            acc[report.reportType] = (acc[report.reportType] || 0) + 1;
            return acc;
        }, {});
        
        const recentReports = reports.filter(
            report => Date.now() - new Date(report.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
        ).length;

        return {
            totalReports,
            reportsByType,
            recentReports
        };
    };

    const getProblematicPatterns = () => {
        // Analyze reports to identify patterns
        const patterns = {};
        
        reports.forEach(report => {
            // Look for common words/phrases in reported content
            const words = report.messageContent.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 3);

            words.forEach(word => {
                if (!patterns[word]) {
                    patterns[word] = {
                        count: 0,
                        reportTypes: new Set(),
                        contexts: []
                    };
                }
                patterns[word].count++;
                patterns[word].reportTypes.add(report.reportType);
                patterns[word].contexts.push({
                    text: report.selectedText || report.messageContent.substring(0, 100),
                    reportType: report.reportType,
                    timestamp: report.timestamp
                });
            });
        });

        // Return patterns that appear in multiple reports
        return Object.entries(patterns)
            .filter(([_word, data]) => data.count > 1)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10);
    };

    const shouldWarnUser = (messageContent) => {
        if (!reportingSettings.autoBlock) return false;

        const patterns = getProblematicPatterns();
        const contentLower = messageContent.toLowerCase();

        // Check if message contains frequently reported patterns
        return patterns.some(([word, data]) => {
            if (data.count > 2 && contentLower.includes(word)) {
                return true;
            }
            return false;
        });
    };

    const getContextualFeedback = (reportType) => {
        const typeReports = reports.filter(r => r.reportType === reportType);
        if (typeReports.length === 0) return null;

        // Get common feedback themes for this report type
        const feedbackThemes = typeReports.reduce((acc, report) => {
            const words = report.feedback.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 4);
            
            words.forEach(word => {
                acc[word] = (acc[word] || 0) + 1;
            });
            return acc;
        }, {});

        const topThemes = Object.entries(feedbackThemes)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);

        return {
            commonThemes: topThemes,
            reportCount: typeReports.length,
            recentFeedback: typeReports
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 3)
                .map(r => r.feedback)
        };
    };

    const exportReports = () => {
        const exportData = {
            reports: reports,
            settings: reportingSettings,
            stats: getReportStats(),
            patterns: getProblematicPatterns(),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mench-ai-reports-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const deleteReport = (reportId) => {
        setReports(prev => prev.filter(r => r.id !== reportId));
    };

    const updateSettings = (newSettings) => {
        setReportingSettings(prev => ({ ...prev, ...newSettings }));
    };

    return {
        reports,
        reportingSettings,
        submitReport,
        getReportStats,
        getProblematicPatterns,
        shouldWarnUser,
        getContextualFeedback,
        exportReports,
        deleteReport,
        updateSettings
    };
};
