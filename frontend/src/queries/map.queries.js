import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as mapApi from '@/api/map.api';

export const mapKeys = {
  friends: ['map', 'friends'],
  privacy: ['map', 'privacy'],
};

export function useMapFriendsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: mapKeys.friends,
    queryFn: mapApi.getFriendsOnMap,
    enabled,
    staleTime: 15_000,
  });
}

export function useMapPrivacyQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: mapKeys.privacy,
    queryFn: mapApi.getMyPrivacy,
    enabled,
    staleTime: 60_000,
  });
}

export function useSetMapPrivacyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mapApi.setMyPrivacy,
    onSuccess: (privacy) => {
      queryClient.setQueryData(mapKeys.privacy, privacy);
      queryClient.invalidateQueries({ queryKey: mapKeys.friends });
    },
  });
}

export function useClearMyLocationMutation() {
  return useMutation({
    mutationFn: mapApi.clearMyLocation,
  });
}
