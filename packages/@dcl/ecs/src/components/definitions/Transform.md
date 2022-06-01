
# Transform

```cpp
// Transform length = 44 
struct Transform {
    float positionX;
    float positionY;
    float positionZ;

    float rotationX;
    float rotationY;
    float rotationZ;
    float rotationW;

    float scaleX;
    float scaleY;
    float scaleZ;

    uint32_t parentEntity;
};
```
- Serialized in big-endian