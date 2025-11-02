import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export function useThreadMessages(threadId: string) {
  return useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      const res = await fetch(`/api/messages?threadId=${threadId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      contactId: string;
      body: string;
    }) => {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },

    onMutate: async (newMsg) => {
      const queryKey = ["messages", newMsg.contactId];
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => [
        ...(old || []),
        {
          id: "temp-" + Date.now(),
          ...newMsg,
          direction: "OUTBOUND",
          createdAt: new Date().toISOString(),
        },
      ]);

      return { previous };
    },

    onError: (err, vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["messages", vars.contactId],
          ctx.previous
        );
      }
    },

    onSettled: (data, error, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", vars.contactId],
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