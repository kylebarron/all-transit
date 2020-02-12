"""
Filter records by time:
head -n 1 test.json | jq 'if (.origin_departure_time | split(":")[0] | tonumber > 7) then . else empty end'

Filter by service days of week:
head -n 1 test.json | jq 'if .service_days_of_week[0] == true then . else empty end'

Both (you can use and or or)
head -n 1 test.json | jq 'if (.origin_departure_time | split(":")[0] | tonumber > 7) and (.service_days_of_week[0] == true) then . else empty end'

If you use stdin, then you can do
cat ssp.json | python filter_ssp.py args ... | python ssp_geom.py > ssp.geojson

or you could even have this program just generate jq strings, so that you could use it like:
cat ...  | jq -f <(python make_jq --args) > out.json
or
cat ... | jq "$(python ...)"

"""
import click


@click.command()
@click.option(
    '-d',
    '--day',
    type=int,
    default=None,
    help='Service days of week. 0 is Monday, 6 is Sunday (?)')
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


def construct_filters(day, start_hour, end_hour):
    """Construct jq filter string

    Applied filters are combined using AND
    """
    filters = []
    if day is not None:
        s = f'(.service_days_of_week[{day}] == true)'
        filters.append(s)

    if start_hour is not None:
        s = f'(.origin_departure_time | split(":")[0] | tonumber >= {start_hour})'
        filters.append(s)

    if end_hour is not None:
        s = f'(.origin_departure_time | split(":")[0] | tonumber < {end_hour})'
        filters.append(s)

    if filters:
        return ' and '.join(filters)

    else:
        return '.'


if __name__ == '__main__':
    main()
