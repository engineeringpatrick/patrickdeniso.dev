import './App.css';
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

export default App;
