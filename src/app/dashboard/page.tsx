"use client";

import React, { useState, useEffect, useMemo } from "react";

// Utility function to clean phone numbers
const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/^whatsapp:/i, '');
};

import { useContacts, useThreadMessages, useSendMessage } from "@/lib/hooks/useMessages";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  channel: z.enum(["sms", "whatsapp"]).default("whatsapp"),
});

type Channel = 'sms' | 'whatsapp';

export default function Dashboard() {
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<Channel>('whatsapp');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    channel: "whatsapp" as Channel,
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const selectedContact = contacts?.find(
    (c: any) => c.id === selectedContactId
  );

  // Define thread type
  interface Thread {
    id: string;
    contactId: string;
    channel: 'sms' | 'whatsapp';
    isUnread: boolean;
    isArchived: boolean;
    lastMessageAt: string | null;
    createdAt: string;
  }

  // Get or create thread based on contact and selected channel
  const { data: thread, refetch: refetchThread } = useQuery({
    queryKey: ['thread', selectedContactId, selectedChannel],
    queryFn: async (): Promise<Thread | null> => {
      if (!selectedContactId) return null;
      try {
        console.log('Fetching thread for:', { selectedContactId, selectedChannel });
        const res = await fetch(`/api/threads?contactId=${selectedContactId}&channel=${selectedChannel}`);
        if (!res.ok) {
          const error = await res.text();
          console.error('Failed to fetch thread:', error);
          throw new Error('Failed to fetch thread');
        }
        const data = await res.json();
        console.log('Fetched thread:', data);
        return data;
      } catch (error) {
        console.error('Error in thread query:', error);
        throw error;
      }
    },
    enabled: !!selectedContactId,
    // Keep previous data while refetching to prevent UI flicker
    keepPreviousData: true,
  });

  // Use the thread ID from the database
  const threadId = thread?.id || '';

  // Use the thread ID with channel information
  const { data: messages = [], refetch: refetchMessages } = useThreadMessages(threadId);

  // Refetch thread and messages when channel or contact changes
  useEffect(() => {
    if (selectedContactId) {
      console.log('Channel or contact changed, refetching thread and messages...', {
        selectedContactId,
        selectedChannel,
        threadId
      });
      refetchThread().then(() => {
        // After thread is refetched, refetch messages with the updated thread ID
        refetchMessages();
      });
    }
  }, [selectedChannel, selectedContactId, refetchThread, refetchMessages, threadId]);
  
  // Log thread and messages for debugging
  useEffect(() => {
    console.log('Thread ID:', threadId);
    console.log('Thread data:', thread);
    console.log('Messages:', messages);
  }, [threadId, thread, messages]);
  
  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!threadId) return;
    
    console.log('Setting up message refresh for thread:', threadId);
    const interval = setInterval(() => {
      console.log('Refreshing messages for thread:', threadId);
      refetchMessages();
    }, 5000);
    
    return () => {
      console.log('Clearing message refresh interval');
      clearInterval(interval);
    };
  }, [threadId, refetchMessages]);

  const sendMessage = useSendMessage();

  const handleSend = () => {
    if (!selectedContactId || !messageBody.trim()) return;

    sendMessage.mutate({
      contactId: selectedContactId,
      body: messageBody,
      channel: selectedChannel,
    });

    setMessageBody("");
  };

  const createContact = useMutation({
    mutationFn: async (contactData: { name: string; phone: string; channel: Channel }) => {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create contact");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsContactModalOpen(false);
      setNewContact({ name: "", phone: "", channel: "whatsapp" });
      setContactErrors({});
    },
    onError: (error: any) => {
      setContactErrors({ submit: error.message });
    },
  });

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = contactSchema.safeParse(newContact);
      if (!validatedData.success) {
        const errors: Record<string, string> = {};
        validatedData.error.issues.forEach((issue) => {
          // Ensure path[0] is a string before using it as an index
          const path = issue.path[0];
          if (typeof path === 'string') {
            errors[path] = issue.message;
          } else {
            // Fallback for non-string paths
            errors['_error'] = issue.message;
          }
        });
        setContactErrors(errors);
        return;
      }
      await createContact.mutateAsync(validatedData.data);
    } catch (error) {
      console.error("Error creating contact:", error);
      setContactErrors({
        _error: error instanceof Error ? error.message : 'Failed to create contact'
      });
    }
  };

  if (contactsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r bg-gray-50">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Unified Inbox</h1>
        </div>

        <div className="p-4">
          <button 
            onClick={() => setIsContactModalOpen(true)}
            className="w-full bg-blue-600 text-white py-2 rounded mb-4 hover:bg-blue-700 transition-colors"
          >
            + New Contact
          </button>

          {/* Contact Creation Modal */}
          {isContactModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Add New Contact</h2>
                
                <form onSubmit={handleCreateContact}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={(e) => 
                          setNewContact({...newContact, name: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2"
                        placeholder="John Doe"
                      />
                      {contactErrors.name && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <div className="flex">
                        <input
                          type="tel"
                          value={newContact.phone}
                          onChange={(e) => 
                            setNewContact({...newContact, phone: e.target.value })
                          }
                          className="flex-1 border rounded-l px-3 py-2"
                          placeholder="+1234567890"
                        />
                        <select
                          value={newContact.channel}
                          onChange={(e) => 
                            setNewContact({...newContact, channel: e.target.value as Channel})
                          }
                          className="border-t border-r border-b border-l-0 rounded-r px-3 py-2 bg-gray-50"
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="sms">SMS</option>
                        </select>
                      </div>
                      {contactErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">{contactErrors.phone}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Include country code (e.g., +1 for US, +91 for India)
                      </p>
                    </div>

                    {contactErrors.submit && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                        {contactErrors.submit}
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsContactModalOpen(false);
                          setContactErrors({});
                        }}
                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                        disabled={createContact.isPending}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        disabled={createContact.isPending}
                      >
                        {createContact.isPending ? 'Saving...' : 'Save Contact'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto">
          {contacts?.map((contact: any) => {
            const lastMessageTime = new Date(contact.lastMessageAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContactId(contact.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 border-b ${
                  selectedContactId === contact.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium">{contact.name}</div>
                  <span className="text-xs text-gray-400">
                    {lastMessageTime}
                  </span>
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {cleanPhoneNumber(contact.phone)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-semibold">{selectedContact.name}</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Send as:</span>
                  <select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value as Channel)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-500">{selectedContact.phone}</p>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedChannel.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages?.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.direction === "OUTBOUND"
                          ? "bg-blue-500 text-white ml-auto"
                          : "bg-gray-100 mr-auto"
                      } max-w-xs`}
                    >
                      <div className="break-words">{msg.body}</div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-gray-400">
                          {msg.direction === 'OUTBOUND' 
                            ? 'You' 
                            : selectedContact?.name || cleanPhoneNumber(selectedContact?.phone || '')}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {msg.channel?.toUpperCase() || 'SMS'}
                          </span>
                          <div className="text-xs text-gray-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Composer */}
            <div className="p-4 border-t flex gap-2">
              <input
                type="text"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Type a message..."
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={handleSend}
                disabled={sendMessage.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a contact to start
          </div>
        )}
      </div>
    </div>
  );
}