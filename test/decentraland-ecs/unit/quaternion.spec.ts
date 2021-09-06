import { Quaternion, Vector3 } from '../../../packages/decentraland-ecs/src'

const results = {
  staticAngle01: '90.00',
  staticAngle02: '14.85',
  staticAngle03: '4.99997',
  staticAngle04: '180',
  staticEuler01: '(0.0, 0.0, 0.0, 1.0)',
  staticEuler02: '(0.5, -0.5, 0.5, 0.5)',
  staticEuler03: '(0.0, 0.9, -0.4, 0.0)',
  staticEuler04: '(0.8, 0.0, 0.6, 0.0)',
  staticEuler05: '(-0.7, 0.2, -0.2, -0.6)',
  staticFromToRotation01: '(0.0, 180.0, 0.0)',
  staticFromToRotation02: '(0.0, 93.9, 0.0)',
  staticFromToRotation03: '(0.0, 0.0, 44.5)',
  staticFromToRotation04: '(45.0, 360.0, 360.0)',
  staticFromToRotation05: '(335.2, 276.2, 152.5)',
  staticFromToRotation06: '(39.1, 335.6, 352.5)',
  staticFromToRotation07: '(12.8, 45.1, 351.9)',
  staticFromToRotation08: '(35.3, 345.0, 315.0)',
  staticRotateTowards01: '(0.1, 0.1, 0.1, 1.0)',
  staticRotateTowards02: '(0.0, 0.1, 0.0, 1.0)',
  staticRotateTowards03: '(0.0, 0.1, -0.1, -1.0)',
  staticRotateTowards04: '(0.0, 0.0, 0.0, 1.0)',
  staticLookRotation01: '(-0.3, 0.4, 0.1, 0.9)',
  staticLookRotation02: '(0.0, 0.0, 0.0, 1.0)',
  staticLookRotation03: '(0.0, 0.7, 0.0, 0.7)',
  staticLookRotation04: '(0.0, 0.9, 0.4, 0.0)',
  staticSlerp01: '(0.5, 0.2, 0.2, 0.8)',
  staticSlerp02: '(0.0, 0.1, 0.8, 0.6)',
  staticSlerp03: '(-0.1, 0.0, -0.1, 1.0)',
  staticSlerp04: '(0.0, 0.3, 0.0, 0.9)',
  eulerAngles01: '(10.0, 10.0, 10.0)',
  eulerAngles02: '(0.0, 90.0, 0.0)',
  eulerAngles03: '(80.0, 190.0, 220.0)',
  eulerAngles04: '(360.0, 10.0, 0.0)',
  normalized01: '(0.1, 0.1, 0.1, 1.0)',
  normalized02: '(0.0, 0.7, 0.0, 0.7)',
  normalized03: '(-0.7, 0.2, -0.2, -0.6)',
  normalized04: '(0.0, -0.1, 0.0, -1.0)',
  setFromToRotation01: '(0.0, 0.0, -0.7, 0.7)',
  setFromToRotation02: '(0.7, 0.0, 0.0, 0.7)',
  setFromToRotation03: '(0.5, -0.3, -0.1, 0.8)',
  setFromToRotation04: '(-0.1, -0.5, -0.3, 0.8)',
  setFromToRotation05: '(0.0, 1.0, 0.0, 0.0)',
  setFromToRotation06: '(0.0, 0.0, 0.0, 1.0)',
  setFromToRotation07: '(-1.0, 0.0, 0.0, 0.0)',
  setFromToRotation08: '(0.0, 0.0, 0.0, 1.0)'
}

const normalize = (v: string) => (v === '-0.0' ? '0.0' : v)

function quaternionToString(quat: Quaternion) {
  const x = normalize(quat.x.toFixed(1).substr(0, 6))
  const y = normalize(quat.y.toFixed(1).substr(0, 6))
  const z = normalize(quat.z.toFixed(1).substr(0, 6))
  const w = normalize(quat.w.toFixed(1).substr(0, 6))

  return `(${x}, ${y}, ${z}, ${w})`
}

function vector3ToString(vec: Vector3) {
  const x = normalize(vec.x.toFixed(1).substr(0, 6))
  const y = normalize(vec.y.toFixed(1).substr(0, 6))
  const z = normalize(vec.z.toFixed(1).substr(0, 6))

  return `(${x}, ${y}, ${z})`
}

describe('ECS Quaternion tests', () => {
  it('Quaternion.Angle', () => {
    expect(Quaternion.Angle(Quaternion.Euler(0, 0, 0), Quaternion.Euler(90, 90, 90)).toString().substr(0, 5)).toEqual(
      results.staticAngle01.substr(0, 5)
    )

    expect(Quaternion.Angle(Quaternion.Euler(10, 0, 10), Quaternion.Euler(360, 0, -1)).toString().substr(0, 5)).toEqual(
      results.staticAngle02.substr(0, 5)
    )

    expect(Quaternion.Angle(Quaternion.Euler(0, 5, 0), Quaternion.Euler(0, 0, 0)).toString().substr(0, 5)).toEqual(
      results.staticAngle03.substr(0, 5)
    )

    expect(
      Quaternion.Angle(Quaternion.Euler(360, -360, 0), Quaternion.Euler(180, 90, 0)).toString().substr(0, 5)
    ).toEqual(results.staticAngle04.substr(0, 5))
  })

  it('Quaternion.Euler', () => {
    expect(quaternionToString(Quaternion.Euler(0, 0, 0))).toEqual(results.staticEuler01)

    expect(quaternionToString(Quaternion.Euler(90, 0, 90))).toEqual(results.staticEuler02)

    expect(quaternionToString(Quaternion.Euler(45, 180, -1))).toEqual(results.staticEuler03)

    expect(quaternionToString(Quaternion.Euler(360, 110, -180))).toEqual(results.staticEuler04)

    expect(quaternionToString(Quaternion.Euler(100, 10, 400))).toEqual(results.staticEuler05)
  })

  it('Quaternion.RotateTowards', () => {
    expect(
      quaternionToString(Quaternion.RotateTowards(Quaternion.Euler(10, 10, 10), Quaternion.Euler(100, 100, 100), 0.1))
    ).toEqual(results.staticRotateTowards01)

    expect(
      quaternionToString(Quaternion.RotateTowards(Quaternion.Euler(0, 10, -0), Quaternion.Euler(0, 9, 45), 0.1))
    ).toEqual(results.staticRotateTowards02)

    expect(
      quaternionToString(Quaternion.RotateTowards(Quaternion.Euler(360, -10, 10), Quaternion.Euler(0, 100, 0), 0.1))
    ).toEqual(results.staticRotateTowards03)

    expect(
      quaternionToString(Quaternion.RotateTowards(Quaternion.Euler(0, 0, 0), Quaternion.Euler(0, 0, 0), 0.1))
    ).toEqual(results.staticRotateTowards04)
  })

  it('Quaternion.LookRotation', () => {
    expect(quaternionToString(Quaternion.LookRotation(new Vector3(1, 1, 1), Vector3.Up()))).toEqual(
      results.staticLookRotation01
    )

    expect(quaternionToString(Quaternion.LookRotation(new Vector3(-10, -0, 110), Vector3.Up()))).toEqual(
      results.staticLookRotation02
    )

    expect(quaternionToString(Quaternion.LookRotation(new Vector3(1230, 10, 0), Vector3.Up()))).toEqual(
      results.staticLookRotation03
    )

    expect(quaternionToString(Quaternion.LookRotation(new Vector3(0, 123, -123), Vector3.Up()))).toEqual(
      results.staticLookRotation04
    )
  })

  // These tests check against euler angles since we get a different quaternion result in Unity, but represent the same euler angles rotation.
  it('Quaternion.FromToRotation', () => {
    expect(
      vector3ToString(Quaternion.FromToRotation(new Vector3(0, 0, 0), new Vector3(100, 100, 100)).eulerAngles)
    ).toEqual(results.staticFromToRotation01)

    expect(
      vector3ToString(Quaternion.FromToRotation(new Vector3(-10, -0, 110), new Vector3(4452, 0, 100)).eulerAngles)
    ).toEqual(results.staticFromToRotation02)

    expect(
      vector3ToString(Quaternion.FromToRotation(new Vector3(1230, 10, 0), new Vector3(100, 100, 0)).eulerAngles)
    ).toEqual(results.staticFromToRotation03)

    expect(
      vector3ToString(Quaternion.FromToRotation(new Vector3(0, 123, -123), new Vector3(100, 213123, 100)).eulerAngles)
    ).toEqual(results.staticFromToRotation04)

    expect(
      vector3ToString(Quaternion.FromToRotation(new Vector3(-10, -10, -10), new Vector3(360, -10, 360)).eulerAngles)
    ).toEqual(results.staticFromToRotation05)

    expect(
      vector3ToString(Quaternion.FromToRotation(new Vector3(12, -0, -400), new Vector3(200, 360, -400)).eulerAngles)
    ).toEqual(results.staticFromToRotation06)

    expect(
      vector3ToString(Quaternion.FromToRotation(new Vector3(25, 45, 180), new Vector3(127, 0, 90)).eulerAngles)
    ).toEqual(results.staticFromToRotation07)

    expect(vector3ToString(Quaternion.FromToRotation(new Vector3(0, 1, 0), new Vector3(1, 1, 1)).eulerAngles)).toEqual(
      results.staticFromToRotation08
    )
  })

  it('quaternion.eulerAngles', () => {
    expect(vector3ToString(Quaternion.Euler(10, 10, 10).eulerAngles)).toEqual(results.eulerAngles01)

    expect(vector3ToString(Quaternion.Euler(0, 90, 0).eulerAngles)).toEqual(results.eulerAngles02)

    expect(vector3ToString(Quaternion.Euler(100, 10, 400).eulerAngles)).toEqual(results.eulerAngles03)

    expect(vector3ToString(Quaternion.Euler(360, 10, 0).eulerAngles)).toEqual(results.eulerAngles04)
  })

  it('quaternion.normalized', () => {
    expect(quaternionToString(Quaternion.Euler(10, 10, 10).normalized)).toEqual(results.normalized01)

    expect(quaternionToString(Quaternion.Euler(0, 90, 0).normalized)).toEqual(results.normalized02)

    expect(quaternionToString(Quaternion.Euler(100, 10, 400).normalized)).toEqual(results.normalized03)

    expect(quaternionToString(Quaternion.Euler(360, 10, 0).normalized)).toEqual(results.normalized04)
  })

  it('quaternion.setFromToRotation', () => {
    let upVector = Vector3.Up()
    let quat = Quaternion.Identity
    quat.setFromToRotation(Vector3.Up(), Vector3.Right(), upVector)
    expect(quaternionToString(quat)).toEqual(results.setFromToRotation01)

    upVector = Vector3.Up()
    quat = Quaternion.Identity
    quat.setFromToRotation(Vector3.Up(), Vector3.Forward(), upVector)
    expect(quaternionToString(quat)).toEqual(results.setFromToRotation02)

    upVector = new Vector3(50, 0, -39)
    quat = Quaternion.Identity
    quat.setFromToRotation(new Vector3(38, 56, 23), new Vector3(12, -5, 99), upVector)
    expect(quaternionToString(quat)).toEqual(results.setFromToRotation03)

    upVector = new Vector3(-60, -80, -23)
    quat = Quaternion.Identity
    quat.setFromToRotation(new Vector3(-50, 0.5, 15), new Vector3(-66, 66, -91), upVector)
    expect(quaternionToString(quat)).toEqual(results.setFromToRotation04)

    upVector = Vector3.Up()
    quat = Quaternion.Identity
    quat.setFromToRotation(new Vector3(-1, 0, 0), new Vector3(1, 0, 0), upVector) // Parallel opposite vectors case
    expect(quaternionToString(quat)).toEqual(results.setFromToRotation05)

    upVector = Vector3.Up()
    quat = Quaternion.Identity
    quat.setFromToRotation(new Vector3(1, 0, 0), new Vector3(1, 0, 0), upVector) // same vectors case
    expect(quaternionToString(quat)).toEqual(results.setFromToRotation06)

    upVector = Vector3.Left()
    quat = Quaternion.Identity
    quat.setFromToRotation(new Vector3(0, 1, 0), new Vector3(0, -1, 0), upVector)
    expect(quaternionToString(quat)).toEqual(results.setFromToRotation07)

    upVector = Vector3.Left()
    quat = Quaternion.Identity
    quat.setFromToRotation(new Vector3(0, -1, 0), new Vector3(0, -1, 0), upVector)
    expect(quaternionToString(quat)).toEqual(results.setFromToRotation08)
  })

  it('Quaternion.Slerp', () => {
    expect(quaternionToString(Quaternion.Slerp(Quaternion.Euler(10, 10, 10), Quaternion.Euler(45, 45, 45), 1))).toEqual(
      results.staticSlerp01
    )

    expect(
      quaternionToString(Quaternion.Slerp(Quaternion.Euler(-10, -0, 110), Quaternion.Euler(4100, 100, 100), 0.00123))
    ).toEqual(results.staticSlerp02)

    expect(
      quaternionToString(Quaternion.Slerp(Quaternion.Euler(0, 123, -123), Quaternion.Euler(360, -10, 360), 0.9))
    ).toEqual(results.staticSlerp03)

    expect(
      quaternionToString(Quaternion.Slerp(Quaternion.Euler(1, 1, 0), Quaternion.Euler(12, 12341, 1), 0.4))
    ).toEqual(results.staticSlerp04)
  })
})
