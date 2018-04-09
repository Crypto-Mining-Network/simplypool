from datetime import timedelta


def get_delta(granularity_spec, granularity):
    if granularity_spec == "T":
        return timedelta(minutes=granularity)
    elif granularity_spec == "H":
        return timedelta(hours=granularity)


def align_backward(date, granularity):
    granularity_spec = granularity[-1]
    granularity = int(granularity[:-1])
    delta = get_delta(granularity_spec, granularity)

    if granularity_spec == "T":
        _date = date.replace(minute=0, second=0, microsecond=0, tzinfo=None)
    elif granularity_spec == "H":
        _date = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)

    while _date <= date:
        _date += delta
    return _date - delta
