import { useWorkspace } from '/@/hooks/useWorkspace';

import { Container } from '../Container';
import { Loader } from '../Loader';
import { Navbar, NavbarItem } from '../Navbar';
import { SceneList } from '../SceneList';
import { TutorialsWrapper } from '../Tutorials';

import { sortProjectsBy } from './utils';

import './styles.css';

export function ScenesPage() {
  const { isLoading, projects, sortBy, setSortBy } = useWorkspace();

  return (
    <main className="ScenesPage">
      <Navbar active={NavbarItem.SCENES} />
      <Container>
        <TutorialsWrapper>
          {isLoading ? (
            <Loader size={70} />
          ) : (
            <SceneList
              projects={sortProjectsBy(projects, sortBy)}
              sortBy={sortBy}
              onSort={setSortBy}
            />
          )}
        </TutorialsWrapper>
      </Container>
    </main>
  );
}
