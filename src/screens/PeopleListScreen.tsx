import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import PeoplePane from "./PeopleScreen";

export default function PeopleListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSelectPerson = useCallback(
    (personId: string) => {
      navigation.navigate("PersonProfile", { personId });
    },
    [navigation],
  );

  return <PeoplePane onSelectPerson={handleSelectPerson} />;
}
