import { Routes, Route } from "react-router-dom";
import PublicProfile from "./pages/PublicProfile";
import Home from "./pages/Home";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:slug" element={<PublicProfile />} />
      <Route path="*" element={<Home notFound />} />
    </Routes>
  );
}

export default App;
