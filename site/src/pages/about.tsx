import * as React from "react";
import { Header, Container, Segment, Icon, List } from "semantic-ui-react";
import { withLayout } from "../components/Layout";

const AttributionItem = props => {
  const { key, license = {}, name = null } = props.item;
  const { attr_text = null, url = null } = license;

  return (
    <List.Item key={key}>
      {url ? (
        <a href={url}>{attr_text && <p>{attr_text}</p>}</a>
      ) : (
        <div>{attr_text && <p>{attr_text}</p>}</div>
      )}
    </List.Item>
  );
};

class AboutPage extends React.Component {
  state = {
    attributionData: null
  };

  componentDidMount = () => {
    fetch("https://data.kylebarron.dev/all-transit/attribution.json")
      .then(response => {
        if (response.status === 200) {
          return response.json();
        }
        return null;
      })
      .then(data => {
        console.log(data);
        this.setState({ attributionData: data });
      });
  };

  render() {
    const { attributionData } = this.state;
    return (
      <Container>
        <Segment vertical>
          <Header as="h2">
            <Icon name="info circle" />
            <Header.Content>About</Header.Content>
          </Header>
        </Segment>
        <Segment vertical>
          <p>This starter was created by @fabien0102.</p>
          <p>
            For any question, I'm on{" "}
            <a href="https://discord.gg/2bz8EzW" target="blank">
              discord #reactiflux/gatsby
            </a>
          </p>
          <p>
            For any issues, any PR are welcoming
            <a
              href="https://github.com/fabien0102/gatsby-starter/issues"
              target="blank"
            >
              {" "}
              on this repository
            </a>
          </p>
        </Segment>
        <Header as="h2">
          <Header.Content>Attribution</Header.Content>
        </Header>
        <Segment vertical>
          <p>
            This project wouldn't be possible without the hard work of those
            working on the Transitland database and the transit agencies who
            release their data to the public.
          </p>
          <p>
            Attribution statements are auto-generated from the license
            information in the Transitland database. As such, the following is
            very messy, but is an attempt at displaying attribution statements
            for all providers who require one.
          </p>
          <Segment vertical/>
          {attributionData ? (
            <div>
              <List>
                {attributionData.map(attr => (
                  <AttributionItem item={attr} />
                ))}
              </List>
            </div>
          ) : (
            <p>Loading attribution data</p>
          )}
        </Segment>
      </Container>
    );
  }
}

export default withLayout(AboutPage);
