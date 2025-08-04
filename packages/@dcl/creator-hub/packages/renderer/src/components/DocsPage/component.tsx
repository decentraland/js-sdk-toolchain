import { useNavigate } from 'react-router-dom';
import { Grid } from 'decentraland-ui2';
import { t } from '/@/modules/store/translation/utils';
import { misc } from '#preload';

import { Container } from '../Container';
import { Title } from '../Title';
import { Navbar, NavbarItem } from '../Navbar';
import './styles.css';

function Link(props: { url: string; title: string }) {
  return (
    <div
      className="link"
      onClick={() => misc.openExternal(props.url)}
    >
      <i className="icon" />
      <span className="title">{props.title}</span>
    </div>
  );
}

export function DocsPage() {
  const navigate = useNavigate();

  return (
    <main className="DocsPage">
      <Navbar active={NavbarItem.LEARN} />
      <Container>
        <Title
          value={t('learn.docs.title')}
          onBack={() => navigate('/learn')}
        />
        <div className="docs">
          <div className="start">
            <div className="section">
              <h1>Where to start</h1>
              <div className="links horizontal">
                <Link
                  title="Wearable Overview"
                  url="https://docs.decentraland.org"
                />
                <Link
                  title="3D Model Essentials"
                  url="https://docs.decentraland.org/creator/3d-modeling/3d-models/"
                />
                <Link
                  title="Entities and components"
                  url="https://docs.decentraland.org/creator/development-guide/sdk7/entities-components/"
                />
              </div>
            </div>
          </div>
          <div className="sections">
            <Grid
              container
              spacing={4}
            >
              <Grid
                item
                xs={12}
                sm={12}
                md={6}
                lg={4}
                xl={3}
              >
                <div className="section">
                  <h4>Wearables & Emotes</h4>
                  <h5>Wearables</h5>
                  <div className="links vertical">
                    <Link
                      title="Wearable Overview"
                      url="https://docs.decentraland.org/creator/wearables/wearables-overview/"
                    />
                    <Link
                      title="Creating Wearables"
                      url="https://docs.decentraland.org/creator/wearables/creating-wearables/"
                    />
                    <Link
                      title="Linked Wearables"
                      url="https://docs.decentraland.org/creator/wearables/linked-wearables/"
                    />
                    <h5>Emotes</h5>
                    <Link
                      title="Emotes Overview"
                      url="https://docs.decentraland.org/creator/emotes/emotes-overview/"
                    />
                    <Link
                      title="Creating Emotes"
                      url="https://docs.decentraland.org/creator/emotes/creating-and-exporting-emotes/"
                    />
                    <Link
                      title="Avatar Rig"
                      url="https://docs.decentraland.org/creator/emotes/avatar-rig/"
                    />
                  </div>
                </div>
              </Grid>
              <Grid
                item
                xs={12}
                sm={12}
                md={6}
                lg={4}
                xl={3}
              >
                <div className="section">
                  <h4>Tutorials & Examples</h4>
                  <div className="links vertical">
                    <Link
                      title="Example Scenes"
                      url="https://docs.decentraland.org/creator/sdk7/examples/7/"
                    />
                    <Link
                      title="SDK & Editor Videos"
                      url="https://www.youtube.com/playlist?list=PLAcRraQmr_GP_K8WN7csnKnImK4R2TgMA"
                    />
                    <Link
                      title="Emotes Videos"
                      url="https://www.youtube.com/playlist?list=PLAcRraQmr_GN8LcnnQk2BByo9L2Orvp9c"
                    />
                  </div>
                </div>
              </Grid>
              <Grid
                item
                xs={12}
                sm={12}
                md={6}
                lg={4}
                xl={3}
              >
                <div className="section">
                  <h4>SDK</h4>
                  <div className="links vertical">
                    <Link
                      title="Entities and components"
                      url="https://docs.decentraland.org/creator/development-guide/sdk7/entities-components/"
                    />
                    <Link
                      title="Systems"
                      url="https://docs.decentraland.org/creator/development-guide/sdk7/systems/"
                    />
                    <Link
                      title="Custom components"
                      url="https://docs.decentraland.org/creator/development-guide/sdk7/custom-components/"
                    />
                    <Link
                      title="Querying components"
                      url="https://docs.decentraland.org/creator/development-guide/sdk7/querying-components/"
                    />
                    <Link
                      title="Data oriented programming"
                      url="https://docs.decentraland.org/creator/development-guide/sdk7/data-oriented-programming/"
                    />
                  </div>
                </div>
              </Grid>
              <Grid
                item
                xs={12}
                sm={12}
                md={6}
                lg={4}
                xl={3}
              >
                <div className="section">
                  <h4>3D Modeling & Animations</h4>
                  <div className="links vertical">
                    <Link
                      title="3D Model Essentials"
                      url="https://docs.decentraland.org/creator/3d-modeling/3d-models/"
                    />
                    <Link
                      title="Meshes"
                      url="https://docs.decentraland.org/creator/3d-modeling/meshes/"
                    />
                    <Link
                      title="Materials"
                      url="https://docs.decentraland.org/creator/3d-modeling/materials/"
                    />
                    <Link
                      title="Textures"
                      url="https://docs.decentraland.org/creator/3d-modeling/textures/"
                    />
                    <Link
                      title="Colliders"
                      url="https://docs.decentraland.org/creator/3d-modeling/colliders/"
                    />
                    <Link
                      title="Animations"
                      url="https://docs.decentraland.org/creator/3d-modeling/animations/"
                    />
                    <Link
                      title="Create a Rig"
                      url="https://docs.decentraland.org/creator/3d-modeling/create-a-rig/"
                    />
                  </div>
                </div>
              </Grid>
            </Grid>
          </div>
        </div>
      </Container>
    </main>
  );
}
