import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useNotes(contactId: string | null) {
    return useQuery({
        queryKey: ["notes", contactId],
        queryFn: async () => {
            if (!contactId) return [];
            const res = await fetch(`/api/notes?contactId=${contactId}`);
            if (!res.ok) throw new Error("Failed to fetch notes");
            return res.json();
        },
        enabled: !!contactId,
    });
}

export function useCreateNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            contactId: string;
            content: string;
            isPrivate: boolean;
        }) => {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create note");
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["notes", variables.contactId],
            });
        },
    });
}

export function useDeleteNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (noteId: string) => {
            const res = await fetch(`/api/notes/${noteId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete note");
            return res.json();
        },
        onSuccess: (_, noteId) => {
            queryClient.invalidateQueries({
                queryKey: ["notes"],
            });
        },
    });
}

export function useContactProfile(contactId: string | null) {
    return useQuery({
        queryKey: ["contact-profile", contactId],
        queryFn: async () => {
            if (!contactId) return null;
            const res = await fetch(`/api/contacts/${contactId}/profile`);
            if (!res.ok) throw new Error("Failed to fetch profile");
            return res.json();
        },
        enabled: !!contactId,
    });
}
