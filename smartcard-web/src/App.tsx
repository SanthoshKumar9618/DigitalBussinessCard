import { Routes, Route } from "react-router-dom";
import PublicProfile from "./pages/PublicProfile";

function App() {
  return (
    <Routes>
      <Route path="/:slug" element={<PublicProfile />} />
    </Routes>
  );
}

export default App;
