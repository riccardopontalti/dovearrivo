"""Research helper for D01: run the ROUTING.md plan profiles against a local MOTIS.

Usage: python3 d01_plan_probe.py <fromPlace> <toPlace> <YYYY-MM-DD>
Not part of the application; the production adapter is TypeScript.
"""
import json, sys, time, urllib.parse, urllib.request
BASE = "http://127.0.0.1:8080/api/v6/plan"
def plan(frm, to, t, arrive_by, window_s, walk_s=1200, max_tr=1, max_travel=90):
    q = [("fromPlace", frm), ("toPlace", to), ("time", t), ("arriveBy", str(arrive_by).lower()),
         ("timetableView", "true"), ("searchWindow", str(window_s)), ("maxTravelTime", str(max_travel)),
         ("maxTransfers", str(max_tr)), ("transitModes", "TRANSIT"), ("directModes", ""),
         ("preTransitModes", "WALK"), ("postTransitModes", "WALK"), ("pedestrianProfile", "FOOT"),
         ("maxPreTransitTime", str(walk_s)), ("maxPostTransitTime", str(walk_s)),
         ("additionalTransferTime", "2"), ("numItineraries", "1"), ("maxItineraries", "64"), ("timeout", "2")]
    url = BASE + "?" + urllib.parse.urlencode(q)
    t0 = time.perf_counter()
    with urllib.request.urlopen(url) as r: d = json.load(r)
    return d, (time.perf_counter() - t0) * 1000
def show(d, ms, label):
    its = d.get("itineraries", [])
    print(f"== {label}: {len(its)} itineraries in {ms:.0f} ms")
    for it in its:
        legs = " > ".join(f"{l['mode']}{'('+l.get('routeShortName','')+')' if l['mode']!='WALK' else ''} {l['from']['name']}->{l['to']['name']} {l['startTime'][11:16]}Z-{l['endTime'][11:16]}Z" for l in it["legs"])
        walk = sum(l["duration"] for l in it["legs"] if l["mode"] == "WALK")
        print(f"  {it['startTime'][:16]}Z..{it['endTime'][11:16]}Z dur={it['duration']//60}m tr={it['transfers']} walk={walk//60}m | {legs}")
if __name__ == "__main__":
    frm, to, date = sys.argv[1], sys.argv[2], sys.argv[3]
    t0, t1 = f"{date}T09:00:00+02:00", f"{date}T19:00:00+02:00"
    d, ms = plan(frm, to, t0, False, 36000); show(d, ms, "outbound")
    d, ms = plan(to, frm, t1, True, 36000); show(d, ms, "return")
