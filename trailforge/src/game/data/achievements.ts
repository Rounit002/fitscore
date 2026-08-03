export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  target: number;
  reward: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first_km', name: 'Trail Initiate', description: 'Travel 1,000 m in one run', target: 1000, reward: 250 },
  { id: 'five_km', name: 'Ridgeline Legend', description: 'Travel 5,000 m in one run', target: 5000, reward: 1000 },
  { id: 'first_flip', name: 'Sky Turner', description: 'Complete your first flip', target: 1, reward: 150 },
  { id: 'air_three', name: 'Frequent Flyer', description: 'Stay airborne for 3 seconds', target: 3, reward: 200 },
  { id: 'coin_1000', name: 'Treasure Tread', description: 'Collect 1,000 lifetime coins', target: 1000, reward: 300 },
  { id: 'max_upgrade', name: 'Master Mechanic', description: 'Reach level 20 on an upgrade', target: 20, reward: 600 },
  { id: 'three_vehicles', name: 'Full Garage', description: 'Unlock three vehicles', target: 3, reward: 500 },
];
