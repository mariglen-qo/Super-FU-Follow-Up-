import React from 'react';
import { Contact } from '../types';

interface ContactListProps {
    contacts: Contact[];
    onSelectContact: (id: string) => void;
    selectedContactId: string | null;
}

const FollowUpIcon: React.FC<{ method: 'email' | 'text' | 'call' }> = ({ method }) => {
    let path;
    switch (method) {
        case 'email':
            path = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />;
            break;
        case 'text':
            path = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />;
            break;
        case 'call':
            path = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />;
            break;
    }
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {path}
        </svg>
    );
};

const ContactList: React.FC<ContactListProps> = ({ contacts, onSelectContact, selectedContactId }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 h-full">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Contacts</h2>
            {contacts.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No contacts yet. Add one to get started!</p>
            ) : (
                <ul className="space-y-2">
                    {contacts.map(contact => (
                        <li key={contact.id}>
                            <button
                                onClick={() => onSelectContact(contact.id)}
                                className={`w-full text-left p-3 rounded-lg transition duration-200 ${
                                    selectedContactId === contact.id
                                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <p className="font-semibold text-gray-800 dark:text-white">{contact.name || 'Unnamed Contact'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{contact.company || 'No company'}</p>
                                {contact.followUp?.dateTime && (
                                    <div className="mt-2 flex items-center text-xs text-gray-600 dark:text-gray-300 space-x-1.5">
                                        <FollowUpIcon method={contact.followUp.method} />
                                        <span>
                                            {new Date(contact.followUp.dateTime).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ContactList;