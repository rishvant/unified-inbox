"use client";

import React, { useState, useEffect } from "react";

// Utility function to clean phone numbers
const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/^whatsapp:/i, '');
};

import { useContacts, useThreadMessages, useSendMessage } from "@/lib/hooks/useMessages";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ContactProfileModal } from "../components/ContactProfileModal";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  channel: z.enum(["sms", "whatsapp"]).default("whatsapp"),
});

type Channel = 'sms' | 'whatsapp';

function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

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
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);

  const queryClient = useQueryClient();
  const { data: analytics } = useAnalytics();

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

  const handleQuickSend = (channel: 'sms' | 'whatsapp') => {
    setSelectedChannel(channel);
    setShowProfileModal(false);
    // Focus will automatically be on message input
    setTimeout(() => {
      document.querySelector('input[placeholder="Type a message..."]')?.focus();
    }, 100);
  };

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
    keepPreviousData: true,
  });

  const threadId = thread?.id || '';
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
        refetchMessages();
      });
    }
  }, [selectedChannel, selectedContactId, refetchThread, refetchMessages, threadId]);

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
    setShowSchedule(false);
    setScheduleDate("");
    setScheduleTime("");
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
          const path = issue.path[0];
          if (typeof path === 'string') {
            errors[path] = issue.message;
          } else {
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
      <div className="w-80 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Unified Inbox</h1>
        </div>

        {/* Analytics Section - Only show when no contact selected */}
        {!selectedContactId && (
          <div className="p-4 bg-white border-b">
            <h2 className="text-sm font-bold mb-3">📊 Analytics</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded text-center">
                <p className="text-xs text-gray-600">Messages</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics?.totalMessages || 0}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <p className="text-xs text-gray-600">Contacts</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics?.contactsCount || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <p className="text-xs text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analytics?.avgResponseTimeMinutes || 0}m
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <p className="text-xs text-gray-600">Channels</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analytics?.messagesByChannel?.length || 0}
                </p>
              </div>
            </div>

            {/* Channel breakdown */}
            {analytics?.messagesByChannel && analytics.messagesByChannel.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold mb-2 text-gray-600">By Channel</h3>
                <div className="space-y-1">
                  {analytics.messagesByChannel.map((item: any) => (
                    <div key={item.channel} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{item.channel}</span>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
          >
            + New Contact
          </button>

          {/* Contact Creation Modal */}
          {isContactModalOpen && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white/95 backdrop-blur-md rounded-xl p-6 w-full max-w-md shadow-2xl border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Add New Contact</h2>
                  <button
                    onClick={() => setIsContactModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateContact}>
                  <div className="space-y-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-100 shadow-sm">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, name: e.target.value })
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
                            setNewContact({ ...newContact, phone: e.target.value })
                          }
                          className="flex-1 border rounded-l px-3 py-2"
                          placeholder="+1234567890"
                        />
                        <select
                          value={newContact.channel}
                          onChange={(e) =>
                            setNewContact({ ...newContact, channel: e.target.value as Channel })
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
                        <div className="pt-2">
                          Cancel
                        </div>
                      </button>
                      <button
                        type="submit"
                        disabled={createContact.isPending}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          {contacts?.map((contact: any) => {
            const lastMessageTime = contact.lastMessageAt
              ? new Date(contact.lastMessageAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
              : '';

            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContactId(contact.id)}
                className={`p-4 cursor-pointer hover:bg-gray-100 border-b transition-colors ${selectedContactId === contact.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium">{contact.name}</div>
                  {lastMessageTime && (
                    <span className="text-xs text-gray-400">
                      {lastMessageTime}
                    </span>
                  )}
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
            <div className="p-4 border-b bg-white">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{selectedContact.name}</h2>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    View Profile
                  </button>
                </div>
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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4">
                {messages?.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages?.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`p-3 rounded-lg max-w-xs ${msg.direction === "OUTBOUND"
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-white text-gray-900 rounded-bl-none shadow"
                          }`}
                      >
                        <div className="break-words">{msg.body}</div>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${msg.direction === "OUTBOUND"
                            ? "bg-blue-400 text-white"
                            : "bg-gray-100 text-gray-600"
                            }`}>
                            {msg.channel?.toUpperCase() || 'SMS'}
                          </span>
                          <div className={`text-xs ${msg.direction === "OUTBOUND" ? "text-blue-100" : "text-gray-400"
                            }`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Composer */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {showSchedule && (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                      />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className={`px-3 py-2 border rounded hover:bg-gray-50 ${showSchedule ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                  title="Schedule message"
                >
                  ⏰
                </button>

                <button
                  onClick={handleSend}
                  disabled={sendMessage.isPending || !messageBody.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showSchedule ? "Schedule" : "Send"}
                </button>
              </div>
            </div>

            {showProfileModal && (
              <ContactProfileModal
                contactId={selectedContactId}
                onClose={() => setShowProfileModal(false)}
                onSendMessage={handleQuickSend}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50">
            <div className="text-center">
              <p className="text-2xl mb-2">👋 Welcome to Unified Inbox</p>
              <p className="text-gray-400">Select a contact to start messaging</p>

              {analytics && (
                <div className="mt-8 bg-white p-6 rounded-lg shadow">
                  <p className="text-4xl font-bold text-blue-600 mb-2">
                    {analytics.totalMessages}
                  </p>
                  <p className="text-sm text-gray-600">Total Messages Sent</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
