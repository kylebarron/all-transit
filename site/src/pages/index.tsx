import * as React from "react";
import { LayoutProps } from "../components/Layout";
import Map from "../components/Map";

const IndexPage = (props: LayoutProps) => <Map location={props.location} />;

export default IndexPage;
