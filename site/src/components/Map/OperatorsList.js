import * as React from "react";
import { Checkbox, List } from "semantic-ui-react";
import { uniqBy, sortBy } from "lodash";

function ListItem(props) {
  const { operator = {}, onChange, operatorsDisabled } = props;
  const { onestop_id, name, short_name, website } = operator;
  const isDisabled = operatorsDisabled[onestop_id] || false;

  return (
    <List.Item>
      <Checkbox checked={!isDisabled} onChange={() => onChange(onestop_id)} />{" "}
      <a href={website} target="_blank" rel="noopener noreferrer">
        {short_name || name}
      </a>
    </List.Item>
  );
}

export function OperatorsList(props) {
  const { operators = [], onChange, operatorsDisabled } = props;
  const uniqueOperators = uniqBy(operators, "onestop_id");
  // While sorting by onestop_id isn't intuitive, it at least gives a stable
  // sorting, and it appears to generally be alphabetical by name.
  const sortedOperators = sortBy(uniqueOperators, 'onestop_id')
  return (
    <List>
      {sortedOperators.map(operator => (
        <ListItem
          key={operator.onestop_id}
          operator={operator}
          onChange={onChange}
          operatorsDisabled={operatorsDisabled}
        />
      ))}
    </List>
  );
}
