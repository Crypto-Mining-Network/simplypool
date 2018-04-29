import aiohttp


async def post_json(url, data=None, json=None):
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data, json=json) as resp:
            return (await resp.json())


async def get_json(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            return (await resp.json())