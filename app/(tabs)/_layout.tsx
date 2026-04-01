import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="account" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="list/[id]" />
    </Tabs>
  );
}
