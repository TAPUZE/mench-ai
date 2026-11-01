import React, { useState } from 'react';
import { 
    FileText, 
    Calendar, 
    Flag, 
    AlertTriangle, 
    MessageSquare,
    XCircle,
    Download,
    Trash2,
    Filter,
    Search,
    ChevronDown,
    ChevronUp,
    BarChart3
} from 'lucide-react';

const ReportManager = ({ 
    reports, 
    onDeleteReport, 
    onExportReports,
    onUpdateSettings: _onUpdateSettings,
    reportingSettings: _reportingSettings,
    t = {} 
}) => {
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [showStats, setShowStats] = useState(false);
    const [expandedReport, setExpandedReport] = useState(null);

    const reportTypeLabels = {
        inappropriate: t.inappropriate || 'Inappropriate Content',
        inaccurate: t.inaccurate || 'Inaccurate Information',
        unhelpful: t.unhelpful || 'Unhelpful Response',
        offensive: t.offensive || 'Offensive Language',
        religious: t.religiousIssue || 'Religious Sensitivity Issue',
        other: t.other || 'Other Issue'
    };

    const reportTypeIcons = {
        inappropriate: AlertTriangle,
        inaccurate: XCircle,
        unhelpful: MessageSquare,
        offensive: Flag,
        religious: AlertTriangle,
        other: Flag
    };

    const filteredReports = reports
        .filter(report => {
            if (filter !== 'all' && report.reportType !== filter) return false;
            if (searchTerm && !report.feedback.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.timestamp) - new Date(a.timestamp);
                case 'oldest':
                    return new Date(a.timestamp) - new Date(b.timestamp);
                case 'type':
                    return a.reportType.localeCompare(b.reportType);
                default:
                    return 0;
            }
        });

    const getReportStats = () => {
        const totalReports = reports.length;
        const reportsByType = reports.reduce((acc, report) => {
            acc[report.reportType] = (acc[report.reportType] || 0) + 1;
            return acc;
        }, {});
        
        const recentReports = reports.filter(
            report => Date.now() - new Date(report.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
        ).length;

        return { totalReports, reportsByType, recentReports };
    };

    const stats = getReportStats();

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString() + ' ' + 
               new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const truncateText = (text, maxLength = 100) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
                    <FileText size={24} />
                    {t.reportManager || 'Report Manager'}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md text-sm flex items-center gap-2"
                    >
                        <BarChart3 size={14} />
                        {t.stats || 'Stats'}
                    </button>
                    <button
                        onClick={onExportReports}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center gap-2"
                    >
                        <Download size={14} />
                        {t.export || 'Export'}
                    </button>
                </div>
            </div>

            {/* Stats Panel */}
            {showStats && (
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-200 mb-4">
                        {t.reportStats || 'Report Statistics'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{stats.totalReports}</div>
                            <div className="text-sm text-gray-400">{t.totalReports || 'Total Reports'}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">{stats.recentReports}</div>
                            <div className="text-sm text-gray-400">{t.recentReports || 'Recent (7 days)'}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400">
                                {Object.keys(stats.reportsByType).length}
                            </div>
                            <div className="text-sm text-gray-400">{t.reportTypes || 'Report Types'}</div>
                        </div>
                    </div>
                    
                    {/* Report Types Breakdown */}
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                            {t.reportsByType || 'Reports by Type'}
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(stats.reportsByType).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">
                                        {reportTypeLabels[type]}
                                    </span>
                                    <span className="text-sm font-medium text-gray-200">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">{t.allTypes || 'All Types'}</option>
                        {Object.entries(reportTypeLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder={t.searchReports || 'Search reports...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    />
                </div>
                
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="newest">{t.newest || 'Newest First'}</option>
                    <option value="oldest">{t.oldest || 'Oldest First'}</option>
                    <option value="type">{t.byType || 'By Type'}</option>
                </select>
            </div>

            {/* Reports List */}
            <div className="space-y-4">
                {filteredReports.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        {t.noReports || 'No reports found'}
                    </div>
                ) : (
                    filteredReports.map(report => {
                        const Icon = reportTypeIcons[report.reportType] || Flag;
                        const isExpanded = expandedReport === report.id;
                        
                        return (
                            <div key={report.id} className="bg-gray-700 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Icon size={16} className="text-red-400 mt-0.5" />
                                        <div>
                                            <h3 className="font-medium text-gray-200">
                                                {reportTypeLabels[report.reportType]}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Calendar size={12} />
                                                {formatDate(report.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                                            className="p-1 text-gray-400 hover:text-gray-200 rounded"
                                        >
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        <button
                                            onClick={() => onDeleteReport(report.id)}
                                            className="p-1 text-gray-400 hover:text-red-400 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <p className="text-sm text-gray-300">
                                        {truncateText(report.feedback, isExpanded ? 1000 : 150)}
                                    </p>
                                </div>
                                
                                {isExpanded && (
                                    <div className="border-t border-gray-600 pt-3 mt-3 space-y-3">
                                        {report.selectedText && (
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-300 mb-1">
                                                    {t.selectedText || 'Selected Text:'}
                                                </h4>
                                                <div className="bg-gray-800 p-2 rounded text-sm text-gray-400 italic">
                                                    "{report.selectedText}"
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-300 mb-1">
                                                {t.originalMessage || 'Original Message:'}
                                            </h4>
                                            <div className="bg-gray-800 p-2 rounded text-sm text-gray-400 max-h-32 overflow-y-auto">
                                                {report.messageContent}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>ID: {report.id}</span>
                                            <span>Message ID: {report.messageId}</span>
                                            <span>Status: {report.status || 'stored'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ReportManager;
