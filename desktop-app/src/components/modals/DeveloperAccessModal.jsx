import React, { useState } from 'react';
import { X, Key, AlertTriangle } from 'lucide-react';

const DeveloperAccessModal = ({ isOpen, onClose, onDeveloperCodeSubmit }) => {
    const [devCode, setDevCode] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (devCode === 'MENCH_DEV_2025') {
            onDeveloperCodeSubmit(devCode);
            setDevCode('');
            setError('');
            onClose();
        } else {
            setError('Invalid developer code');
            setDevCode('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-red-600">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-400" />
                        <h2 className="text-xl font-bold text-red-400">Developer Access</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="mb-4">
                    <div className="p-3 bg-red-900 border border-red-600 rounded text-red-200 text-sm">
                        <strong>⚠️ WARNING:</strong> Developer mode removes ALL content restrictions and safety filters. 
                        This mode is intended for development and testing purposes only.
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Key size={16} className="inline mr-1" />
                            Developer Code
                        </label>
                        <input
                            type="password"
                            value={devCode}
                            onChange={(e) => setDevCode(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-md p-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Enter developer access code"
                            autoComplete="off"
                        />
                        {error && (
                            <p className="text-red-400 text-sm mt-1">{error}</p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Enable Developer Mode
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <div className="mt-4 text-xs text-gray-500">
                    <p>• This mode bypasses all content filtering</p>
                    <p>• Use only for legitimate development purposes</p>
                    <p>• Localhost development automatically enables this mode</p>
                </div>
            </div>
        </div>
    );
};

export default DeveloperAccessModal;
