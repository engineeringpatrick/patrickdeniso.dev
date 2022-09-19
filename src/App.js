import './App.css';
<<<<<<< HEAD

function App() {
  return (
    <div className="App">
      
    </div>
  );
}
=======
import { Canvas, useFrame } from '@react-three/fiber';
import Box from './components/Box';
import Header from './components/Header';

const App = () => (
  <div className="App">
    <Header></Header>
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box position={[-1.2, 0, 0]} />
      <Box position={[1.2, 0, 0]} />
    </Canvas>
  </div>
);
>>>>>>> 09388d6483a6269bafdd024879dfee61b57ff4c3

export default App;
