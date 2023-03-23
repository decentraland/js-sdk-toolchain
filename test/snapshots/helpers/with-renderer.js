import { Engine } from '@dcl/ecs/dist/engine';
let called = false;
export function withRenderer(cb) {
    if (called)
        throw new Error('Only call withRenderer once');
    called = true;
    const engine = Engine();
    const outMessages = [];
    const rendererTransport = {
        async send(message) {
            outMessages.push(message);
        },
        filter() {
            return true;
        }
    };
    engine.addTransport(rendererTransport);
    cb(engine);
    globalThis.exports.onServerUpdate = async function (data) {
        if (rendererTransport.onmessage) {
            rendererTransport.onmessage(data);
            await engine.update(0);
            if (outMessages.length > 1) {
                throw new Error('Problem with amount of outgoint messages');
            }
            if (outMessages.length === 1) {
                const r = outMessages.shift();
                return r;
            }
        }
        return new Uint8Array();
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2l0aC1yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndpdGgtcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsT0FBTyxFQUFXLE1BQU0sRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXRELElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQTtBQUVsQixNQUFNLFVBQVUsWUFBWSxDQUFDLEVBQTZCO0lBQ3hELElBQUksTUFBTTtRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtJQUMxRCxNQUFNLEdBQUcsSUFBSSxDQUFBO0lBRWIsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUE7SUFFdkIsTUFBTSxXQUFXLEdBQWlCLEVBQUUsQ0FBQTtJQUVwQyxNQUFNLGlCQUFpQixHQUFjO1FBQ25DLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTztZQUNoQixXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzNCLENBQUM7UUFDRCxNQUFNO1lBQ0osT0FBTyxJQUFJLENBQUE7UUFDYixDQUFDO0tBQ0YsQ0FBQTtJQUVELE1BQU0sQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUV0QyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQ1Q7SUFBQyxVQUFrQixDQUFDLE9BQU8sQ0FBQyxjQUFjLEdBQUcsS0FBSyxXQUFXLElBQWdCO1FBQzVFLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFO1lBQy9CLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUVqQyxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdEIsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFBO2FBQzVEO1lBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDNUIsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUM3QixPQUFPLENBQUMsQ0FBQTthQUNUO1NBQ0Y7UUFFRCxPQUFPLElBQUksVUFBVSxFQUFFLENBQUE7SUFDekIsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRyYW5zcG9ydCB9IGZyb20gJ0BkY2wvZWNzJ1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9iYW4tdHMtY29tbWVudFxuLy8gQHRzLWlnbm9yZVxuaW1wb3J0IHsgSUVuZ2luZSwgRW5naW5lIH0gZnJvbSAnQGRjbC9lY3MvZGlzdC9lbmdpbmUnXG5cbmxldCBjYWxsZWQgPSBmYWxzZVxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aFJlbmRlcmVyKGNiOiAoZW5naW5lOiBJRW5naW5lKSA9PiB2b2lkKSB7XG4gIGlmIChjYWxsZWQpIHRocm93IG5ldyBFcnJvcignT25seSBjYWxsIHdpdGhSZW5kZXJlciBvbmNlJylcbiAgY2FsbGVkID0gdHJ1ZVxuXG4gIGNvbnN0IGVuZ2luZSA9IEVuZ2luZSgpXG5cbiAgY29uc3Qgb3V0TWVzc2FnZXM6IFVpbnQ4QXJyYXlbXSA9IFtdXG5cbiAgY29uc3QgcmVuZGVyZXJUcmFuc3BvcnQ6IFRyYW5zcG9ydCA9IHtcbiAgICBhc3luYyBzZW5kKG1lc3NhZ2UpIHtcbiAgICAgIG91dE1lc3NhZ2VzLnB1c2gobWVzc2FnZSlcbiAgICB9LFxuICAgIGZpbHRlcigpIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG5cbiAgZW5naW5lLmFkZFRyYW5zcG9ydChyZW5kZXJlclRyYW5zcG9ydClcblxuICBjYihlbmdpbmUpXG4gIDsoZ2xvYmFsVGhpcyBhcyBhbnkpLmV4cG9ydHMub25TZXJ2ZXJVcGRhdGUgPSBhc3luYyBmdW5jdGlvbiAoZGF0YTogVWludDhBcnJheSkge1xuICAgIGlmIChyZW5kZXJlclRyYW5zcG9ydC5vbm1lc3NhZ2UpIHtcbiAgICAgIHJlbmRlcmVyVHJhbnNwb3J0Lm9ubWVzc2FnZShkYXRhKVxuXG4gICAgICBhd2FpdCBlbmdpbmUudXBkYXRlKDApXG5cbiAgICAgIGlmIChvdXRNZXNzYWdlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvYmxlbSB3aXRoIGFtb3VudCBvZiBvdXRnb2ludCBtZXNzYWdlcycpXG4gICAgICB9XG5cbiAgICAgIGlmIChvdXRNZXNzYWdlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgY29uc3QgciA9IG91dE1lc3NhZ2VzLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHJcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoKVxuICB9XG59XG4iXX0=