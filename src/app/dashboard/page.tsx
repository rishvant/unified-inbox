"use client";

import { useState } from "react";
import { useContacts, useThreadMessages, useSendMessage } from "@/lib/hooks/useMessages";

export default function Dashboard() {
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");

  const selectedContact = contacts?.find(
    (c: any) => c.id === selectedContactId
  );

  const { data: messages = [] } = useThreadMessages(
    selectedContact ? `${selectedContact.id}_sms` : ""
  );

  const sendMessage = useSendMessage();

  const handleSend = () => {
    if (!selectedContactId || !messageBody.trim()) return;

    sendMessage.mutate({
      contactId: selectedContactId,
      body: messageBody,
    });

    setMessageBody("");
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
          <button className="w-full bg-blue-600 text-white py-2 rounded mb-4">
            + New Contact
          </button>
        </div>

        <div className="overflow-y-auto">
          {contacts?.map((contact: any) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContactId(contact.id)}
              className={`p-4 cursor-pointer hover:bg-gray-100 border-b ${
                selectedContactId === contact.id ? "bg-blue-100" : ""
              }`}
            >
              <div className="font-medium">{contact.name}</div>
              <div className="text-sm text-gray-500">{contact.phone}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">{selectedContact.name}</h2>
              <p className="text-sm text-gray-500">{selectedContact.phone}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded ${
                      msg.direction === "OUTBOUND"
                        ? "bg-blue-500 text-white ml-auto"
                        : "bg-gray-200"
                    } max-w-xs`}
                  >
                    {msg.body}
                  </div>
                ))}
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