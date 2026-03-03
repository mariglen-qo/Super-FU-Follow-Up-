
import React, { useState, useEffect, useCallback } from 'react';
import { Contact, FollowUp } from '../types';
import { generateFollowUp, scheduleEmailWithGmail } from '../services/geminiService';
import AudioTranscriber from './AudioTranscriber';

interface ContactProfileProps {
    contact: Contact;
    onUpdateContact: (updatedContact: Contact) => void;
    showToast: (message: string, type: 'success' | 'error') => void;
    isGmailConnected: boolean;
}

const ContactProfile: React.FC<ContactProfileProps> = ({ contact, onUpdateContact, showToast, isGmailConnected }) => {
    const [localContact, setLocalContact] = useState<Contact>(contact);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setLocalContact(contact);
        setIsDirty(false); // Reset dirty state when a new contact is selected
    }, [contact]);

    useEffect(() => {
        // Only set dirty if it's not the initial load for this contact
        if (JSON.stringify(contact) !== JSON.stringify(localContact)) {
            setIsDirty(true);
        }
    }, [localContact, contact]);

    const handleInputChange = (field: keyof Contact, value: string) => {
        const updated = { ...localContact, [field]: value };
        setLocalContact(updated);
    };
    
    const handleFollowUpChange = (field: keyof FollowUp, value: any) => {
        const updated = {
            ...localContact,
            followUp: {
                ...(localContact.followUp || { method: 'email', dateTime: '', generatedContent: { body: '' }, status: 'pending' }),
                [field]: value,
            }
        };
        setLocalContact(updated);
    };

    const handleGenerateFollowUp = useCallback(async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const content = await generateFollowUp(localContact);
            handleFollowUpChange('generatedContent', content);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsGenerating(false);
        }
    }, [localContact, handleFollowUpChange]);

    const handleSchedule = async () => {
        if (!isGmailConnected) {
            showToast('Please connect your Gmail account from the header to schedule emails.', 'error');
            return;
        }

        if (!localContact.followUp) return;
        
        setIsScheduling(true);
        try {
            const result = await scheduleEmailWithGmail(localContact);
            if (result.success) {
                const updatedContactWithSchedule = {
                    ...localContact,
                    followUp: {
                        ...localContact.followUp,
                        status: 'scheduled' as const,
                    },
                };
                onUpdateContact(updatedContactWithSchedule);
                showToast('Follow-up scheduled successfully via Gmail!', 'success');
            } else {
                showToast(result.message || 'Failed to schedule follow-up.', 'error');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
            showToast(message, 'error');
        } finally {
            setIsScheduling(false);
        }
    };

    const handleSave = () => {
        onUpdateContact(localContact);
        setIsDirty(false);
        showToast('Contact saved successfully!', 'success');
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <input
                    type="text"
                    value={localContact.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none w-full"
                    placeholder="Contact Name"
                />
            </div>
            
            {/* Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries({
                    title: 'Title', email: 'Email', phone: 'Phone', company: 'Company', address: 'Address'
                }).map(([key, label]) => (
                    <div key={key}>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</label>
                        <input
                            type="text"
                            value={localContact[key as keyof Contact] as string}
                            onChange={(e) => handleInputChange(key as keyof Contact, e.target.value)}
                            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={label}
                        />
                    </div>
                ))}
            </div>

            {/* Notes */}
            <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</label>
                <div className="relative">
                     <textarea
                        value={localContact.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={4}
                        className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Add notes about this contact..."
                    />
                    <AudioTranscriber onTranscript={(text) => handleInputChange('notes', localContact.notes + '\n' + text)} />
                </div>
            </div>

            {/* Follow-up Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                <h3 className="text-lg font-semibold">Schedule Follow-up</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Method</label>
                        <select
                            value={localContact.followUp?.method || 'email'}
                            onChange={(e) => handleFollowUpChange('method', e.target.value)}
                            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="email">Email</option>
                            <option value="text">Text</option>
                            <option value="call">Call</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date & Time</label>
                        <input
                            type="datetime-local"
                            value={localContact.followUp?.dateTime || ''}
                            onChange={(e) => handleFollowUpChange('dateTime', e.target.value)}
                            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                
                 <button
                    onClick={handleGenerateFollowUp}
                    disabled={isGenerating || !localContact.notes || !localContact.followUp?.method}
                    className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition"
                >
                    {isGenerating ? 'Generating...' : 'Generate Follow-up Content'}
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}

                {localContact.followUp?.generatedContent && (
                    <div className="space-y-4 pt-4">
                        {localContact.followUp.method === 'email' && (
                             <input
                                type="text"
                                value={localContact.followUp.generatedContent.subject || ''}
                                onChange={(e) => handleFollowUpChange('generatedContent', { ...localContact.followUp?.generatedContent, subject: e.target.value })}
                                placeholder="Subject"
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3"
                             />
                        )}
                        <textarea
                            value={localContact.followUp.generatedContent.body}
                            onChange={(e) => handleFollowUpChange('generatedContent', { ...localContact.followUp?.generatedContent, body: e.target.value })}
                            rows={8}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3"
                            placeholder="Generated body..."
                        />
                        <button
                            onClick={handleSchedule}
                            disabled={!localContact.followUp.dateTime || contact.followUp?.status === 'scheduled' || isScheduling}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2 px-4 rounded-lg transition"
                        >
                            {isScheduling 
                                ? 'Scheduling...' 
                                : contact.followUp?.status === 'scheduled' 
                                    ? 'Scheduled via Gmail' 
                                    : 'Schedule with Gmail'}
                        </button>
                    </div>
                )}
            </div>
             {isDirty && (
                <div className="sticky bottom-4 text-center">
                    <button 
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition transform hover:scale-105"
                    >
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
};

export default ContactProfile;