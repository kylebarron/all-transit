import json

import click


@click.command()
@click.argument('file', type=click.File())
def main(file):
    attributions = []
    for line in file:
        d = json.loads(line)
        attribution = generate_attr(d)

        if attribution is None:
            continue

        attributions.append(attribution)

    print(json.dumps(attributions))


def generate_attr(d):
    props = d['properties']
    lic = props['license']

    if lic == {}:
        return None

    if lic.get('use_without_attribution') == 'yes':
        return None

    res = {}
    res['key'] = props['onestop_id']
    name = props['name']
    res['name'] = name

    res['license'] = {}
    if lic.get('url'):
        res['license']['url'] = lic['url']
    if lic.get('spdx_identifier'):
        res['license']['spdx_identifier'] = lic['spdx_identifier']
    if lic.get('attribution_instructions'):
        res['license']['attribution_instructions'] = lic[
            'attribution_instructions']
    if props.get('license_attribution_text'):
        res['license']['attr_text'] = props['license_attribution_text']

    return res


if __name__ == '__main__':
    main()
