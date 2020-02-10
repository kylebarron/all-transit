import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { toggleSidebar } from "../../store";
import {
  Container,
  Label,
  Menu,
  Icon,
  Header,
  Segment,
  Grid
} from "semantic-ui-react";
import { MenuProps } from "../Menu";

interface HeaderMenuProps extends MenuProps {
  dispatch?: Dispatch<any>;
  inverted?: boolean;
}

export const HeaderMenu = ({
  items,
  pathname,
  Link,
  inverted,
  dispatch
}: HeaderMenuProps) => (
  <Container fluid text>
    <Menu
      size="large"
      className="mobile only"
      pointing
      secondary
      inverted={inverted}
    >
      <Menu.Item
        as="a"
        className="mobile only"
        icon="sidebar"
        onClick={() => dispatch && dispatch(toggleSidebar())}
      />
      <Header
        as="h3"
        inverted
        style={{
          margin: 0,
          alignItems: "center",
          display: "flex",
          justifyContent: "center"
        }}
      >
        All Transit
      </Header>
    </Menu>

    <Menu
      size="large"
      className="mobile hidden"
      pointing
      secondary
      inverted={inverted}
    >
      {/* Put Icon here */}

      {/* {items.map(item => {
        const active = item.exact
          ? pathname === item.path
          : pathname.startsWith(item.path);
        return (
          <Menu.Item
            as={Link}
            className="mobile hidden"
            name={item.name}
            to={item.path}
            key={item.path}
            active={active}
          >
            <Icon name={item.icon} size="small" />
            {item.name}
          </Menu.Item>
        );
      })} */}

      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center"
        }}
      >
        <Menu.Item header>All Transit</Menu.Item>
      </div>
    </Menu>
  </Container>
);

export default connect()(HeaderMenu);
