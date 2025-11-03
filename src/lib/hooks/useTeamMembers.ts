import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  name: string;
  email: string;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch("/api/team/members");
      if (!res.ok) throw new Error("Failed to fetch team members");
      return res.json() as Promise<User[]>;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}