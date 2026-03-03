
import React, { useState, useCallback } from 'react';
import { Contact } from './types';
import BusinessCardUploader from './components/BusinessCardUploader';
import ContactProfile from './components/ContactProfile';
import ContactList from './components/ContactList';
import ChatBot from './components/ChatBot';

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className={`fixed top-5 right-5 ${bgColor} text-white py-2 px-4 rounded-lg shadow-lg z-50 flex items-center transition-transform transform animate-fade-in-down`}>
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 text-white font-bold">&times;</button>
        </div>
    );
};


const App: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'new'>('list');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isGmailConnected, setIsGmailConnected] = useState(false);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    const handleGmailConnect = () => {
        // In a real app, this would trigger the OAuth flow.
        // Here, we'll just toggle the state and show a toast.
        if (!isGmailConnected) {
            setIsGmailConnected(true);
            showToast('Successfully connected to Gmail!', 'success');
        } else {
            setIsGmailConnected(false);
            showToast('Disconnected from Gmail.', 'success');
        }
    };

    const handleContactAdd = (newContact: Omit<Contact, 'id'>) => {
        const contactWithId: Contact = { ...newContact, id: `contact-${Date.now()}` };
        setContacts(prev => [...prev, contactWithId]);
        setSelectedContactId(contactWithId.id);
        setView('list');
        showToast('Contact created successfully!', 'success');
    };
    
    const handleContactUpdate = useCallback((updatedContact: Contact) => {
        setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
        // The toast is now handled by the component that calls this function
        // to allow for more specific messages.
    }, []);

    const handleContactSelect = useCallback((id: string) => {
        setSelectedContactId(id);
        setView('list');
    }, []);
    
    const handleBackToList = () => {
        setSelectedContactId(null);
        setView('list');
    }

    const selectedContact = contacts.find(c => c.id === selectedContactId);

    return (
        <div className="min-h-screen font-sans text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-900">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">SuperFU</h1>
                    <div className="flex items-center space-x-4">
                         <button
                            onClick={handleGmailConnect}
                            className={`font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out ${isGmailConnected ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
                        >
                            {isGmailConnected ? 'Gmail Connected' : 'Connect Gmail'}
                        </button>
                         <button
                            onClick={() => setView(v => v === 'new' ? 'list' : 'new')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                        >
                            {view === 'new' ? 'Cancel' : 'Add New Contact'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {view === 'new' ? (
                    <BusinessCardUploader onContactAdd={handleContactAdd} showToast={showToast} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        <div className="md:col-span-1 lg:col-span-1">
                             <ContactList 
                                contacts={contacts} 
                                onSelectContact={handleContactSelect} 
                                selectedContactId={selectedContactId}
                             />
                        </div>
                        <div className="md:col-span-2 lg:col-span-3">
                           {selectedContact ? (
                                <ContactProfile 
                                    key={selectedContact.id}
                                    contact={selectedContact}
                                    onUpdateContact={handleContactUpdate}
                                    showToast={showToast}
                                    isGmailConnected={isGmailConnected}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                                    <div className="text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No contact selected</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a contact to view their details or add a new one.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
            <ChatBot />
        </div>
    );
};

export default App;