import { useAppStore } from './store/appStore'
import StageOne from './components/stage1/StageOne'
import StageTwo from './components/stage2/StageTwo'
import StageThree from './components/stage3/StageThree'

export default function App() {
  const currentStage = useAppStore((s) => s.currentStage)

  if (currentStage === 3) {
    return <StageThree />
  }

  if (currentStage === 2) {
    return <StageTwo />
  }

  return <StageOne />
}
