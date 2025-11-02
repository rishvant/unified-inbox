import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

interface Message {
  id: string;
  threadId: string;
  body: string;
  direction: 'INBOUND' | 'OUTBOUND';
  channel: 'sms' | 'whatsapp';
  twilioSid: string | null;
  createdAt: string;
}

export function useThreadMessages(threadId: string) {
  return useQuery<Message[]>({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      console.log('useThreadMessages - Fetching messages for thread:', threadId);
      if (!threadId) {
        console.log('useThreadMessages - No threadId provided, returning empty array');
        return [];
      }
      
      try {
        const res = await fetch(`/api/messages?threadId=${encodeURIComponent(threadId)}`);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('useThreadMessages - Error response:', {
            status: res.status,
            statusText: res.statusText,
            error: errorText,
            threadId
          });
          throw new Error(`Failed to fetch messages: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('useThreadMessages - Received messages:', {
          threadId,
          count: Array.isArray(data) ? data.length : 'invalid',
          sample: Array.isArray(data) && data.length > 0 ? data[0] : 'none'
        });
        
        // Ensure all messages have the required fields
        const messages = Array.isArray(data) ? data : [];
        return messages.map(msg => ({
          ...msg,
          channel: msg.channel || 'sms', // Default to 'sms' if channel is missing
          twilioSid: msg.twilioSid || null,
        }));
      } catch (error) {
        console.error('useThreadMessages - Exception:', error);
        throw error;
      }
    },
    enabled: !!threadId,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation<Message, Error, { contactId: string; body: string; channel: 'sms' | 'whatsapp' }>({
        mutationFn: async (data) => {
            console.log('Sending message:', data);
            const res = await fetch("/api/messages/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            
            if (!res.ok) {
                const error = await res.text();
                console.error('Failed to send message:', error);
                throw new Error(error || "Failed to send message");
            }
            
            const result = await res.json();
            console.log('Message sent successfully:', result);
            return result;
        },

        onMutate: async (newMsg) => {
            console.log('onMutate - new message:', newMsg);
            
            // Get or create thread for this contact and channel
            const threadQueryKey = ['thread', newMsg.contactId, newMsg.channel];
            await queryClient.cancelQueries({ queryKey: threadQueryKey });

            // Get the thread from the cache
            const thread = queryClient.getQueryData(threadQueryKey) || { id: `${newMsg.contactId}_${newMsg.channel}` };
            const threadId = thread.id;
            
            console.log('Using thread ID:', threadId);

            const messagesQueryKey = ["messages", threadId];
            await queryClient.cancelQueries({ queryKey: messagesQueryKey });

            const previousMessages = queryClient.getQueryData<Message[]>(messagesQueryKey) || [];

            // Create a temporary message with all required fields
            const tempMessage: Message = {
                id: `temp-${Date.now()}`,
                threadId,
                body: newMsg.body,
                direction: "OUTBOUND",
                channel: newMsg.channel,
                twilioSid: null,
                createdAt: new Date().toISOString(),
            };

            console.log('Optimistic update - adding message:', tempMessage);
            
            // Update the cache with the new message
            queryClient.setQueryData<Message[]>(messagesQueryKey, [...previousMessages, tempMessage]);

            return { previousMessages, threadId };
        },

        onError: (error, variables, context) => {
            console.error('Error sending message:', error);
            
            if (context?.previousMessages) {
                const threadId = context.threadId || `${variables.contactId}_${variables.channel}`;
                console.log('Reverting optimistic update for thread:', threadId);
                queryClient.setQueryData(
                    ["messages", threadId],
                    context.previousMessages
                );
            }
        },

        onSettled: (data, error, variables) => {
            const threadId = `${variables.contactId}_${variables.channel}`;
            console.log('Invalidating queries for thread:', threadId);
            
            // Invalidate both the messages and thread queries
            queryClient.invalidateQueries({
                queryKey: ["messages", threadId],
                refetchType: 'active'
            });
            
            queryClient.invalidateQueries({
                queryKey: ['thread', variables.contactId, variables.channel],
                refetchType: 'active'
            });
            
            // Also invalidate the contacts list to update the last message preview
            queryClient.invalidateQueries({
                queryKey: ["contacts"],
                refetchType: 'active'
            });
        },
    });
}

export function useContacts() {
    return useQuery({
        queryKey: ["contacts"],
        queryFn: async () => {
            const res = await fetch("/api/contacts");
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
    });
}