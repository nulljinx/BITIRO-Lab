import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {SpacesPage} from '../../../src/features/workspaces/WorkspacePages';
createRoot(document.getElementById('root')!).render(<MemoryRouter><SpacesPage/></MemoryRouter>);
