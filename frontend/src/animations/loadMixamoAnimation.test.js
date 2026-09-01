jest.mock("three/examples/jsm/loaders/FBXLoader.js", () => ({
  FBXLoader: class FBXLoader {},
}));

import { detectFbxRig, getMixamoBoneReport } from "./loadMixamoAnimation";

describe("getMixamoBoneReport", () => {
  it("reports each FBX track and its VRM humanoid target", () => {
    const sourceNode = { name: "mixamorigHips" };
    const asset = {
      animations: [{
        name: "mixamo.com",
        tracks: [
          { name: "mixamorig:Hips.quaternion" },
          { name: "mixamorig:LeftArm.quaternion" },
          { name: "CustomSkeletonTail.quaternion" },
        ],
      }],
      getObjectByName: (name) => (name === "mixamorig:Hips" || name === "mixamorigHips" ? sourceNode : null),
    };

    expect(getMixamoBoneReport(asset)).toEqual([
      expect.objectContaining({
        trackName: "mixamorig:Hips.quaternion",
        sourceName: "mixamorig:Hips",
        vrmBoneName: "hips",
        sourceNodeFound: true,
      }),
      expect.objectContaining({
        trackName: "mixamorig:LeftArm.quaternion",
        vrmBoneName: "leftUpperArm",
        sourceNodeFound: false,
      }),
      expect.objectContaining({
        trackName: "CustomSkeletonTail.quaternion",
        vrmBoneName: null,
        sourceNodeFound: false,
      }),
    ]);
  });
});

describe("detectFbxRig", () => {
  it("detects Mixamo and webcam J_Bip tracks automatically", () => {
    const assetFor = (trackNames) => ({
      animations: [{ name: "motion", tracks: trackNames.map((name) => ({ name })) }],
    });

    expect(detectFbxRig(assetFor(["mixamorig:Hips.quaternion"]))).toBe("mixamo");
    expect(detectFbxRig(assetFor(["Armature|Hips.quaternion", "Armature|LeftArm.quaternion"]))).toBe("mixamo");
    expect(detectFbxRig(assetFor(["J_Bip_C_Hips.quaternion"]))).toBe("webcam");
    expect(detectFbxRig(assetFor(["AvatarRoot.quaternion"]))).toBe("unknown");
  });

  it("maps webcam bones to the VRM humanoid", () => {
    const asset = {
      animations: [{ name: "motion", tracks: [{ name: "J_Bip_L_UpperArm.quaternion" }] }],
      getObjectByName: () => null,
    };

    expect(getMixamoBoneReport(asset)[0]).toEqual(expect.objectContaining({
      rigType: "webcam",
      vrmBoneName: "leftUpperArm",
    }));
  });
});