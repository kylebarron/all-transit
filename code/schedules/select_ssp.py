import json
import sqlite3
import sys
from datetime import datetime

import click


@click.command()
@click.option(
    '-f',
    '--sqlite-path',
    type=click.Path(exists=True, dir_okay=False, file_okay=True, readable=True),
    required=True,
    help='Path to sqlite database with ScheduleStopPairs data')
@click.option(
    '--route-id', type=str, required=True, help='route_onestop_id to query for')
@click.option(
    '-h',
    '--origin-departure-hour',
    type=int,
    required=False,
    default=None,
    show_default=True,
    multiple=True,
    help=
    'origin departure hour. If one value is given, it will be considered the start hour; if two are given the second will be considered the non-inclusive end hour. So -h 2 -h 4 would select schedule stop pairs whose origin hour is >= 2 and whose origin hour is < 4.'
)
@click.option(
    '-d',
    '--service-days-of-week',
    type=int,
    required=False,
    default=None,
    show_default=True,
    multiple=True,
    help=
    'day of week to select. Must be provided as integers (where 0 is Monday). -d 2 -d 4 would select schedules on either Wednesday _or_ Friday.'
)
@click.option(
    '--service-date',
    type=str,
    required=False,
    default=None,
    show_default=True,
    help=
    'Date of service. Must be provided as YYYY-MM-DD. Will select schedules whose service_start_date is on or before this date, and whose service_end_date is after this date.'
)
@click.option(
    '--table-name',
    type=str,
    required=False,
    default='ssp',
    show_default=True,
    help='Name of ScheduleStopPairs table in the sqlite database')
@click.option(
    '-c',
    '--column',
    type=str,
    required=False,
    default=None,
    multiple=True,
    help='Extra columns to extract')
def main(
        sqlite_path, table_name, route_id, origin_departure_hour,
        service_days_of_week, service_date, column):
    """Select ScheduleStopPairs from SQLite database
    """
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row

    query_str = generate_query(
        table_name=table_name,
        origin_departure_hour=origin_departure_hour,
        service_days_of_week=service_days_of_week,
        service_date=service_date,
        route_id=route_id,
        columns=column)
    for record in run_query(conn, query_str):
        print(json.dumps(record, separators=(',', ':')))


def run_query(conn, query_str):
    """Run SQLite query on database

    Args:
        - conn: SQLite connection
        - query_str: string to run in SQLite
    """
    cursor = conn.execute(query_str)
    for row in cursor:
        yield {k: row[k] for k in row.keys()}


def generate_query(
        table_name,
        origin_departure_hour=None,
        service_days_of_week=None,
        service_date=None,
        route_id=None,
        columns=None):
    """Generate query for SQLite

    Technically you should use ? in query strings that will be interpolated by
    the DB API to avoid SQL injection attacks, but since this code is only run
    locally I'll just use string interpolation.
    """

    # Define default column names
    default_columns = [
        'origin_onestop_id', 'destination_onestop_id', 'route_onestop_id',
        'route_stop_pattern_onestop_id', 'origin_departure_time',
        'destination_arrival_time']
    if columns:
        assert type(columns) in [list, tuple], 'columns must be list or tuple'
        default_columns.extend(columns)

    column_str = ', '.join(set(default_columns))
    execute_str = f'SELECT {column_str} FROM {table_name} WHERE '

    # Where clause
    where_clause = []
    if route_id:
        where_clause.append(f'route_onestop_id = "{route_id}"')

    if service_days_of_week:
        day_strings = []
        for day in service_days_of_week:
            day_strings.append(f'service_days_of_week_{day} = "true"')

        s = '(' + ' OR '.join(day_strings) + ')'
        where_clause.append(s)

    if origin_departure_hour:
        msg = 'origin_departure_hour should have at most 2 elements'
        assert len(origin_departure_hour) <= 2, msg

        msg = 'origin_departure_hour must be iterable of int'
        assert all(isinstance(x, int) for x in origin_departure_hour), msg

        start = origin_departure_hour[0]
        s = f'CAST(SUBSTR(origin_departure_time, 0, 3) AS INT) >= {start}'
        where_clause.append(s)

        try:
            end = origin_departure_hour[1]
            s = f'CAST(SUBSTR(origin_departure_time, 0, 3) AS INT) < {end}'
            where_clause.append(s)
        except IndexError:
            pass

    if service_date:
        validate_date(service_date)
        where_clause.append(
            f'DATE("{service_date}") >= DATE(service_start_date)')
        where_clause.append(f'DATE("{service_date}") < DATE(service_end_date)')

    execute_str += ' AND '.join(where_clause)
    execute_str += ';'

    # Print query string to stderr
    print(f'Query string:\n{execute_str}', file=sys.stderr)
    return execute_str


def validate_date(date_text):
    try:
        datetime.strptime(date_text, '%Y-%m-%d')
    except ValueError:
        raise ValueError("Incorrect data format, should be YYYY-MM-DD")


if __name__ == '__main__':
    main()
