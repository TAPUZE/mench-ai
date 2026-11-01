import React from 'react';
import { X, BookOpen, Calculator, Microscope, Laptop, Globe, User } from 'lucide-react';

const EducationalGuide = ({ isOpen, onClose, language, translations }) => {

translations[language];
    
    const educationalExamples = [
        {
            icon: <Calculator className="text-blue-400" size={24} />,
            persona: "Math Teacher",
            title: "Mathematics",
            examples: [
                "Help me solve this algebra problem: 2x + 5 = 15",
                "Explain fractions to me",
                "What's the Pythagorean theorem?",
                "Calculate 15% of 200"
            ],
            trigger: "Math keywords: math, calculate, algebra, geometry, statistics"
        },
        {
            icon: <Microscope className="text-green-400" size={24} />,
            persona: "Science Teacher", 
            title: "Science",
            examples: [
                "Explain photosynthesis",
                "How do magnets work?", 
                "What causes earthquakes?",
                "Describe the water cycle"
            ],
            trigger: "Science keywords: science, biology, chemistry, physics, experiment"
        },
        {
            icon: <BookOpen className="text-purple-400" size={24} />,
            persona: "Language Teacher",
            title: "English & Language",
            examples: [
                "Help me write a better sentence",
                "What's the difference between 'their' and 'there'?",
                "Explain metaphors",
                "Check my grammar"
            ],
            trigger: "Language keywords: grammar, writing, english, vocabulary"
        },
        {
            icon: <Laptop className="text-orange-400" size={24} />,
            persona: "Computer Teacher",
            title: "Technology & Coding",
            examples: [
                "Teach me basic HTML",
                "What is programming?",
                "How do computers work?",
                "Write a simple JavaScript function"
            ],
            trigger: "Tech keywords: computer, programming, code, software, technology"
        },
        {
            icon: <Globe className="text-yellow-400" size={24} />,
            persona: "History Teacher",
            title: "History",
            examples: [
                "Tell me about ancient Egypt",
                "What caused World War II?",
                "Explain the Renaissance",
                "Who was Abraham Lincoln?"
            ],
            trigger: "History keywords: history, historical, ancient, civilization"
        },
        {
            icon: <User className="text-gray-400" size={24} />,
            persona: "General Tutor",
            title: "General Learning",
            examples: [
                "Help me study for my test",
                "Explain this concept to me",
                "I need homework help",
                "What's the best way to learn?"
            ],
            trigger: "General keywords: help, learn, study, homework, question"
        }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-gray-200 flex items-center gap-2">
                        <BookOpen size={24} className="text-blue-400" />
                        Educational Personas Guide
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-200 mb-3">
                            🎓 Smart Teacher Selection
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Kosher AI automatically chooses the right teacher persona based on your question. 
                            Each persona is designed to provide focused, clear, and practical educational help 
                            while maintaining our Orthodox Jewish values.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {educationalExamples.map((subject, index) => (
                            <div key={index} className="bg-gray-700 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    {subject.icon}
                                    <div>
                                        <h4 className="font-semibold text-white">{subject.title}</h4>
                                        <p className="text-xs text-gray-400">{subject.persona}</p>
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <h5 className="text-sm font-medium text-gray-300 mb-2">Try asking:</h5>
                                    <ul className="space-y-1">
                                        {subject.examples.map((example, exIndex) => (
                                            <li key={exIndex} className="text-xs text-gray-400 pl-2 border-l-2 border-gray-600">
                                                "{example}"
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div className="bg-gray-800 rounded p-2">
                                    <p className="text-xs text-gray-500">
                                        <strong>Auto-triggers:</strong> {subject.trigger}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 p-4 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-400">
                        <h3 className="text-lg font-semibold text-blue-200 mb-2">
                            💡 Tips for Best Results
                        </h3>
                        <ul className="text-sm text-blue-200 space-y-1">
                            <li>• Be specific about what you need help with</li>
                            <li>• Ask one question at a time for clearer answers</li>
                            <li>• Include key subject words to trigger the right teacher</li>
                            <li>• Say "explain this step by step" for detailed breakdowns</li>
                            <li>• Ask for examples if you need more clarity</li>
                        </ul>
                    </div>
                    
                    <div className="mt-6 p-4 bg-green-900 bg-opacity-30 rounded-lg border border-green-400">
                        <h3 className="text-lg font-semibold text-green-200 mb-2">
                            🕊️ Torah & Jewish Questions
                        </h3>
                        <p className="text-sm text-green-200">
                            For Torah topics, halachic questions, or Jewish law inquiries, our AI automatically 
                            switches to rabbinic personas based on classic Torah authorities. Just ask naturally 
                            about Jewish topics, and you'll get appropriate guidance with proper disclaimers.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EducationalGuide;
