"""
construct_jq.py: Construct a jq filter string from defined arguments

Used like:
Create jq filter string that keeps ScheduleStopPairs that are on Friday,
whose between origin_departure_time is >=4:00pm and <8:00pm, and that ran on
Feb 7, 2020
```
jq_str="$(python code/schedules/construct_jq.py --day-of-week 4 --start-hour 16 --end-hour 20 --service-date '2020-02-07')"
```

Each ScheduleStopPair is a JSON record of the following format:
```json
{
  "origin_onestop_id": "s-9q9j6816dx-redwoodcitycaltrain~laneb",
  "destination_onestop_id": "s-9q9j68004j-elcaminoreal~winklebleckst",
  "route_onestop_id": "r-9q9-398",
  "route_stop_pattern_onestop_id": "r-9q9-398-8e3668-308bae",
  "operator_onestop_id": "o-9q8-samtrans",
  "feed_onestop_id": "f-9q8-samtrans",
  "feed_version_sha1": "5f61042a65a38a0ebb0df9e8dacaadb1bff99634",
  "origin_timezone": "America/Los_Angeles",
  "destination_timezone": "America/Los_Angeles",
  "trip": "10492190-130-Blocks-Weekday-51",
  "trip_headsign": "San Francisco",
  "block_id": null,
  "trip_short_name": "3981016",
  "wheelchair_accessible": null,
  "bikes_allowed": null,
  "pickup_type": null,
  "drop_off_type": null,
  "shape_dist_traveled": 0,
  "origin_arrival_time": "12:00:00",
  "origin_departure_time": "12:00:00",
  "destination_arrival_time": "12:01:00",
  "destination_departure_time": "12:01:00",
  "origin_dist_traveled": 0,
  "destination_dist_traveled": 305.7,
  "service_start_date": "2019-09-16",
  "service_end_date": "2021-01-18",
  "service_added_dates": [],
  "service_except_dates": [],
  "service_days_of_week": [
    true,
    true,
    true,
    true,
    true,
    false,
    false
  ],
  "window_start": "12:00:00",
  "window_end": "12:01:00",
  "origin_timepoint_source": "gtfs_exact",
  "destination_timepoint_source": "gtfs_exact",
  "frequency_start_time": null,
  "frequency_end_time": null,
  "frequency_headway_seconds": null,
  "frequency_type": null,
  "created_at": "2019-10-07T02:43:14.161Z",
  "updated_at": "2019-10-07T02:43:14.161Z"
}
```

"""
from datetime import datetime

import click


@click.command()
@click.option(
    '-d',
    '--day-of-week',
    type=int,
    default=None,
    help='Service days of week. 0 is Monday, 6 is Sunday')
@click.option(
    '--service-date',
    type=str,
    default=None,
    help=
    'Service date, should be in YYYY-MM-DD format. Creates filter such that service date >= service_start_date and < service_end_date'
)
@click.option(
    '-s',
    '--start-hour',
    type=int,
    default=None,
    help='origin_departure_time >= this hour')
@click.option(
    '-e',
    '--end-hour',
    type=int,
    default=None,
    help='origin_departure_time < this hour; (non-inclusive)')
def main(**kwargs):
    """Filter JSON using jq
    """
    filter_str = construct_filters(**kwargs)
    click.echo(filter_str)


def construct_filters(day_of_week, service_date, start_hour, end_hour):
    """Construct jq filter string

    Applied filters are combined using AND
    """
    filters = []
    if day_of_week is not None:
        s = f'(.service_days_of_week[{day_of_week}] == true)'
        filters.append(s)

    if service_date is not None:
        timestamp = round(
            datetime.strptime(service_date, '%Y-%m-%d').timestamp())
        s = f'({timestamp} >= (.service_start_date | strptime("%Y-%m-%d") | mktime))'
        filters.append(s)
        s = f'({timestamp} < (.service_end_date | strptime("%Y-%m-%d") | mktime))'
        filters.append(s)

    if start_hour is not None:
        s = f'(.origin_departure_time | split(":")[0] | tonumber >= {start_hour})'
        filters.append(s)

    if end_hour is not None:
        s = f'(.origin_departure_time | split(":")[0] | tonumber < {end_hour})'
        filters.append(s)

    if filters:
        s = ' and '.join(filters)
        return f'if {s} then . else empty end'

    else:
        return '.'


if __name__ == '__main__':
    main()
