import { useCallback, useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import PeoplePane from "./PeopleScreen";

export default function PeopleListScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Reload when this screen regains focus (e.g. after editing or deleting a
  // person in a pushed/modal screen).
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      setRefreshSignal((n) => n + 1);
    });
    return unsub;
  }, [navigation]);

  const handleSelectPerson = useCallback(
    (personId: string) => {
      navigation.navigate("PersonProfile", { personId });
    },
    [navigation],
  );

  return (
    <PeoplePane
      onSelectPerson={handleSelectPerson}
      refreshSignal={refreshSignal}
    />
  );
}
