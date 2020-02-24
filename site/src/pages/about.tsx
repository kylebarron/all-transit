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

const dataFiles = [
  {
    key: "Operators",
    href:
      "https://data.kylebarron.dev/all-transit/archive/2020_02/operators.geojson.gz",
    desc:
      "A transit agency that offers services to the general public along fixed routes.",
    size: "4 MB"
  },
  {
    key: "Routes",
    href:
      "https://data.kylebarron.dev/all-transit/archive/2020_02/routes.tar.gz",
    desc:
      "All information about a single transit service as defined by the transit agency. A route may have forks and thus may not be a single continuous line.",
    size: "200 MB"
  },
  {
    key: "Route Stop Patterns",
    href:
      "https://data.kylebarron.dev/all-transit/archive/2020_02/route_stop_patterns.tar.gz",
    desc: "Routes split into individual linear geometries.",
    size: "450 MB"
  },
  {
    key: "Stops",
    href:
      "https://data.kylebarron.dev/all-transit/archive/2020_02/stops.tar.gz",
    desc:
      "Each point along a Route or Route Stop Pattern where passengers may get on or off.",
    size: "100 MB"
  },
  {
    key: "Schedule Stop Pairs",
    href:
      "https://data.kylebarron.dev/all-transit/archive/2020_02/ssp_us.json.gz",
    desc:
      "Active schedules for the continental U.S. only.",
    size: "4.8 GB"
  }
];

const DataDownloadsList = () => {
  return (
    <List divided relaxed>
      {dataFiles.map(item => (
        <List.Item key={item.key}>
          <List.Icon name="download" size="large" verticalAlign="middle" />
          <List.Content>
            <List.Header as="a" href={item.href} target="blank">
              {item.key} ({item.size})
            </List.Header>
            <List.Description>{item.desc}</List.Description>
          </List.Content>
        </List.Item>
      ))}
    </List>
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
          <p>
            This website was created by{" "}
            <a href="https://kylebarron.dev" target="blank">
              Kyle Barron
            </a>
            . The code to generate this website is{" "}
            <a href="https://github.com/kylebarron/all-transit" target="blank">
              on Github
            </a>
          </p>
        </Segment>
        <Header as="h3">
          <Header.Content>Frequently Asked Questions</Header.Content>
        </Header>
        <Header as="h4">
          <Header.Content>
            Why are some routes long straight lines?
          </Header.Content>
        </Header>
        Some transit data providers don't include the actual geometries that a
        route travels, and only give the points where a stop occurs. This means
        that there's no way to reliably guess how the transit vehicle travels
        between the two points, and so it shows up in the data as a straight
        line.
        <Header as="h4">
          <Header.Content>How does it work?</Header.Content>
        </Header>
        <p>
          I have a blog post{" "}
          <a href="https://kylebarron.dev/blog/all-transit">here</a> that goes
          into more detail about the behind-the-scenes work that makes
          everything work.
        </p>
        <Header as="h3">
          <Header.Content>Download the data</Header.Content>
        </Header>
        <p>
          The Transitland database currently doesn't offer bulk downloads, so it
          takes a while to download data for the entire planet at 60 requests
          per minute. Below are download links for the data I use in this
          website. All data files were collected in February 2020. For more
          information about how to use the data files, consult the{" "}
          <a href="https://transit.land/documentation/" target="blank">
            Transitland documentation
          </a>
          .
        </p>
        <DataDownloadsList />
        <Header as="h3">
          <Header.Content>Notice a missing transit feed?</Header.Content>
        </Header>
        <p>
          This website uses data from the{" "}
          <a href="https://transit.land" target="blank">
            Transitland database
          </a>
          , which combines{" "}
          <a
            href="https://en.wikipedia.org/wiki/General_Transit_Feed_Specification"
            target="blank"
          >
            General Transit Feed Specification
          </a>{" "}
          (GTFS) feeds into a single database. They have a process for adding a
          new GTFS feed to their database. Read their documentation{" "}
          <a
            href="https://transit.land/documentation/feed-registry/add-a-feed.html"
            target="blank"
          >
            here
          </a>{" "}
          for more information.
        </p>
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
          <Segment vertical />
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
