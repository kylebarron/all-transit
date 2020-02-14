import * as React from "react";
import { Checkbox, List } from "semantic-ui-react";
import { uniqBy } from "lodash";

function ListItem(props) {
  const { operator = {}, onChange, operatorsDisabled } = props;
  const { onestop_id, name, short_name, website } = operator;

  const isDisabled = operatorsDisabled[onestop_id] || false;
  
  return (
    <List.Item>
      <List.Content>
        <List.Header>
          <Checkbox checked={!isDisabled} onChange={() => onChange(onestop_id)} />
          <a href={website} target="_blank" rel="noopener noreferrer">
            {short_name || name}
          </a>
        </List.Header>
      </List.Content>
    </List.Item>
  );
}

export function OperatorsList(props) {
  const { operators = [], onChange, operatorsDisabled } = props;
  const uniqueOperators = uniqBy(operators, "onestop_id");
  return (
    <List>
      {uniqueOperators.map(operator => (
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
