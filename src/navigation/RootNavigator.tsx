import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import MainScreen from "../screens/MainScreen";
import EncounterFormScreen from "../screens/EncounterFormScreen";
import PersonProfileScreen from "../screens/PersonProfileScreen";
import PeopleListScreen from "../screens/PeopleListScreen";
import EditPersonScreen from "../screens/EditPersonScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Main"
        component={MainScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="People"
        component={PeopleListScreen}
        options={{ title: "People" }}
      />
      <Stack.Screen
        name="PersonProfile"
        component={PersonProfileScreen}
        options={{ title: "Profile" }}
      />
      <Stack.Screen
        name="EditPerson"
        component={EditPersonScreen}
        options={{ title: "Edit", presentation: "modal" }}
      />
      <Stack.Screen
        name="EncounterForm"
        component={EncounterFormScreen}
        options={{
          title: "New Encounter",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
