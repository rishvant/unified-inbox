"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTeamMembers } from "@/lib/hooks/useTeamMembers";

interface User {
    id: string;
    name: string;
    email: string;
}

interface MentionableTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    onMention?: (userName: string) => void;
}

export function MentionableTextarea({
    value,
    onChange,
    placeholder = "Type a note... Use @ to mention someone",
    rows = 3,
    onMention,
}: MentionableTextareaProps) {
    const { data: users = [], isLoading } = useTeamMembers();
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mentionBoxRef = useRef<HTMLDivElement>(null);

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "@") {
            setShowMentions(true);
            setMentionSearch("");
            setMentionIndex(0);
            return;
        }

        if (showMentions) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex(Math.min(mentionIndex + 1, filteredUsers.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex(Math.max(mentionIndex - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (filteredUsers[mentionIndex]) {
                    insertMention(filteredUsers[mentionIndex]);
                }
            } else if (e.key === "Escape") {
                setShowMentions(false);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        onChange(text);

        const lastAtIndex = text.lastIndexOf("@");
        const lastSpaceIndex = text.lastIndexOf(" ");

        if (lastAtIndex > lastSpaceIndex) {
            const searchText = text.substring(lastAtIndex + 1);
            setMentionSearch(searchText);
            setShowMentions(true);
            setMentionIndex(0);
        } else {
            setShowMentions(false);
        }
    };

    const insertMention = (user: User) => {
        if (!textareaRef.current) return;

        const text = value;
        const lastAtIndex = text.lastIndexOf("@");
        const beforeMention = text.substring(0, lastAtIndex);
        const afterMention = text.substring(lastAtIndex + mentionSearch.length + 1);

        const newText = `${beforeMention}@${user.name} ${afterMention}`;
        onChange(newText);
        setShowMentions(false);
        onMention?.(user.name);

        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                disabled={isLoading}
                className="w-full border rounded px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />

            {/* Loading state */}
            {isLoading && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded shadow-lg z-10 p-3">
                    <p className="text-sm text-gray-500">Loading team members...</p>
                </div>
            )}

            {/* Mention suggestions dropdown */}
            {showMentions && filteredUsers.length > 0 && (
                <div
                    ref={mentionBoxRef}
                    className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded shadow-lg z-10 max-h-48 overflow-y-auto"
                >
                    {filteredUsers.map((user, idx) => (
                        <button
                            key={user.id}
                            onClick={() => insertMention(user)}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${idx === mentionIndex
                                    ? "bg-blue-100 text-blue-900"
                                    : "hover:bg-gray-50"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium">@{user.name}</span>
                                <span className="text-gray-400 text-xs">{user.email}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showMentions && filteredUsers.length === 0 && mentionSearch && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border rounded shadow-lg z-10 p-3">
                    <p className="text-sm text-gray-500">No users found</p>
                </div>
            )}
        </div>
    );
}