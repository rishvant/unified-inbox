"use client";

import React, { useState } from "react";
import { useNotes, useCreateNote, useDeleteNote, useContactProfile } from "@/lib/hooks/useNotes";
import { useThreadMessages } from "@/lib/hooks/useMessages";
import { MentionableTextarea } from "./MentionableTextarea";

interface ContactProfileModalProps {
    contactId: string | null;
    onClose: () => void;
    onSendMessage?: (channel: 'sms' | 'whatsapp') => void;
}

export function ContactProfileModal({
    contactId,
    onClose,
    onSendMessage
}: ContactProfileModalProps) {
    const { data: profile, isLoading } = useContactProfile(contactId);
    const { data: notes = [] } = useNotes(contactId);
    const createNote = useCreateNote();
    const deleteNote = useDeleteNote();
    const [newNoteContent, setNewNoteContent] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [activeTab, setActiveTab] = useState<"notes" | "history">("notes");

    const handleAddNote = async () => {
        if (!contactId || !newNoteContent.trim()) return;

        await createNote.mutateAsync({
            contactId,
            content: newNoteContent,
            isPrivate,
        });

        setNewNoteContent("");
        setIsPrivate(false);
    };

    if (!contactId) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header with Quick Actions */}
                <div className="p-6 border-b">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-1">{profile?.name}</h2>
                            <p className="text-gray-600 mb-3">{profile?.phone}</p>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        onSendMessage?.('whatsapp');
                                        onClose();
                                    }}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-2"
                                >
                                    💬 WhatsApp
                                </button>
                                <button
                                    onClick={() => {
                                        onSendMessage?.('sms');
                                        onClose();
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2"
                                >
                                    📱 SMS
                                </button>
                                <a
                                    href={`tel:${profile?.phone}`}
                                    className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center gap-2"
                                >
                                    📞 Call
                                </a>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-2xl ml-4"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="px-6 py-4 bg-gray-50 border-b grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-gray-600 text-sm">Total Messages</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {profile?.stats?.totalMessages || 0}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-600 text-sm">Channels Active</p>
                        <p className="text-2xl font-bold text-green-600">
                            {profile?.stats?.threadCount || 0}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-600 text-sm">Last Contact</p>
                        <p className="text-sm font-bold text-purple-600">
                            {profile?.stats?.lastMessageAt
                                ? new Date(profile.stats.lastMessageAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })
                                : "Never"}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-white">
                    <button
                        onClick={() => setActiveTab("notes")}
                        className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === "notes"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-600 hover:text-gray-800"
                            }`}
                    >
                        📝 Notes ({notes?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === "history"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-600 hover:text-gray-800"
                            }`}
                    >
                        📋 Timeline
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeTab === "notes" && (
                        <div>
                            {/* Add Note Form */}
                            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
                                <h3 className="font-bold mb-3 text-gray-800">✍️ Add New Note</h3>
                                <textarea
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    placeholder="Type your note here... (e.g., 'Customer needs follow-up on Friday')"
                                    className="w-full border rounded px-3 py-2 text-sm mb-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                />
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isPrivate}
                                            onChange={(e) => setIsPrivate(e.target.checked)}
                                            className="rounded w-4 h-4"
                                        />
                                        <span className="text-sm text-gray-700">
                                            🔒 Private (Only visible to you)
                                        </span>
                                    </label>
                                    <button
                                        onClick={handleAddNote}
                                        disabled={!newNoteContent.trim() || createNote.isPending}
                                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                    >
                                        {createNote.isPending ? 'Adding...' : 'Add Note'}
                                    </button>
                                </div>
                            </div>

                            {/* <MentionableTextarea
                                value={newNoteContent}
                                onChange={setNewNoteContent}
                                placeholder="Type your note... Use @ to mention someone"
                                rows={3}
                                onMention={(userName) => {
                                    console.log("Mentioned:", userName);
                                }}
                            /> */}

                            {/* Notes List */}
                            <div className="space-y-3">
                                {notes && notes.length > 0 ? (
                                    notes.map((note: any) => (
                                        <div
                                            key={note.id}
                                            className={`p-4 rounded-lg border shadow-sm ${note.isPrivate
                                                ? "bg-red-50 border-red-200"
                                                : "bg-blue-50 border-blue-200"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold px-2 py-1 rounded">
                                                        {note.isPrivate ? "🔒 Private" : "🌐 Public"}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Delete this note?')) {
                                                            deleteNote.mutate(note.id);
                                                        }
                                                    }}
                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                            <p className="text-gray-800 text-sm leading-relaxed mb-2">
                                                {note.content.split(/(@\w+)/g).map((part, idx) => (
                                                    part.startsWith("@") ? (
                                                        <span key={idx} className="bg-blue-100 text-blue-700 font-semibold px-1 rounded">
                                                            {part}
                                                        </span>
                                                    ) : (
                                                        part
                                                    )
                                                ))}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                📅 {new Date(note.createdAt).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed">
                                        <p className="text-gray-400 text-lg mb-2">📝</p>
                                        <p className="text-gray-600">No notes yet</p>
                                        <p className="text-gray-400 text-sm">Add your first note above</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "history" && (
                        <div className="space-y-4">
                            {/* Timeline Header */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border">
                                <h3 className="font-bold mb-3 text-gray-800">📅 Contact Timeline</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-sm text-gray-600">First Contact</span>
                                        <span className="text-sm font-medium">
                                            {profile?.createdAt
                                                ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })
                                                : "Unknown"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-sm text-gray-600">Last Message</span>
                                        <span className="text-sm font-medium">
                                            {profile?.stats?.lastMessageAt
                                                ? new Date(profile.stats.lastMessageAt).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })
                                                : "No messages"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-gray-600">Total Interactions</span>
                                        <span className="text-sm font-medium">
                                            {profile?.stats?.totalMessages || 0} messages
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Activity by Channel */}
                            {profile?.threads && profile.threads.length > 0 && (
                                <div className="bg-white p-4 rounded-lg shadow-sm border">
                                    <h3 className="font-bold mb-3 text-gray-800">📊 Activity by Channel</h3>
                                    <div className="space-y-3">
                                        {profile.threads.map((thread: any) => (
                                            <div key={thread.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">
                                                        {thread.channel === 'whatsapp' ? '💬' : '📱'}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium capitalize">{thread.channel}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Last: {thread.lastMessageAt
                                                                ? new Date(thread.lastMessageAt).toLocaleDateString()
                                                                : 'No messages'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-sm text-gray-600">
                                                    {thread.messages?.length || 0} msgs
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Activity */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border">
                                <h3 className="font-bold mb-3 text-gray-800">🕐 Recent Activity</h3>
                                {profile?.threads?.[0]?.messages && profile.threads[0].messages.length > 0 ? (
                                    <div className="space-y-2">
                                        {profile.threads[0].messages.slice(0, 5).map((msg: any) => (
                                            <div key={msg.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                                                <span className="text-lg">
                                                    {msg.direction === 'OUTBOUND' ? '📤' : '📥'}
                                                </span>
                                                <div className="flex-1">
                                                    <p className="text-sm text-gray-800 line-clamp-2">{msg.body}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {new Date(msg.createdAt).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm text-center py-8">No recent activity</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}