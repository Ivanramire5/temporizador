
import { BrowserRouter, Routes, Route } from "react-router-dom";
import JoinScreen from "./screens/JoinScreen";
import HomeScreen from "./screens/HomeScreen";
import AlarmScreen from "./screens/AlarmScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinScreen />} />
        <Route path="/home/:codigo" element={<HomeScreen />} /> {/* Cambiado de sala a codigo */}
        <Route path="/alarm/:codigo" element={<AlarmScreen />} /> {/* Corregido de //sala */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;